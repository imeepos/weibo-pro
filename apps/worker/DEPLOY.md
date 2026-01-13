# Cloudflare Workers 部署指南

## 问题

wrangler/wrangler 依赖的 miniflare 存在 zod 版本冲突问题，导致 CLI 部署失败。

## 解决方案

### 方案 1: 手动部署（推荐）

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create application** → **Create Worker**
4. Worker 名称: `weibo-proxy-worker`
5. 点击 **Deploy**
6. 部署后点击 **Edit code**
7. 将 `src/index.ts` 的内容粘贴到编辑器
8. 将其他文件内容合并或粘贴（或者使用单个文件版本）
9. 点击 **Save and Deploy**

### 方案 2: 使用 Wrangler 2.x

wrangler 2.x 使用不同版本的 miniflare，可能不存在此问题：

```bash
pnpm remove wrangler
pnpm add -D wrangler@2.20.0
npx wrangler deploy
```

### 方案 3: 使用 GitHub Actions 自动部署

在 `.github/workflows/deploy-worker.yml` 中配置：

```yaml
name: Deploy Worker

on:
  push:
    paths:
      - 'apps/worker/**'
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install -g wrangler@3
      - run: cd apps/worker && wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### 方案 4: 单文件版本（快速测试）

将所有代码合并到一个文件：

```typescript
// src/index-single.ts
const VERSION_INFO = {
  clientVersion: 'v2.47.129',
  serverVersion: 'v2025.10.24.3',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

function toCookieHeader(cookies) {
  if (!cookies) return null;
  if (typeof cookies === 'string') {
    const trimmed = cookies.trim();
    return trimmed.includes('=') ? trimmed : null;
  }
  if (Array.isArray(cookies)) {
    const fragments = cookies
      .map(entry => {
        if (!entry) return '';
        const name = entry.name?.trim() || '';
        const value = entry.value?.trim() || '';
        if (!name || !value) return '';
        return `${name}=${value}`;
      })
      .filter(Boolean);
    return fragments.length > 0 ? fragments.join('; ') : null;
  }
  return null;
}

function extractXsrfToken(cookies) {
  const cookieHeader = toCookieHeader(cookies);
  if (!cookieHeader) return null;
  const cookieList = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookieList) {
    const [name, value] = cookie.split('=').map(s => s.trim());
    if (name === 'XSRF-TOKEN' && value) return value;
  }
  return null;
}

function buildWeiboHeaders(request) {
  const cookieHeader = request.cookies ? toCookieHeader(request.cookies) : null;
  const xsrfToken = request.xsrfToken || (request.cookies ? extractXsrfToken(request.cookies) : null);
  const referer = request.referer || 'https://weibo.com';

  if (!cookieHeader) {
    throw new Error('Cookie is required for Weibo API requests');
  }

  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    'client-version': VERSION_INFO.clientVersion,
    'priority': 'u=1, i',
    'referer': referer,
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'server-version': VERSION_INFO.serverVersion,
    'user-agent': request.userAgent || VERSION_INFO.userAgent,
    'x-requested-with': 'XMLHttpRequest',
    ...(xsrfToken && { 'x-xsrf-token': xsrfToken }),
    'cookie': cookieHeader,
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (path === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (path === '/weibo-proxy' && request.method === 'POST') {
      try {
        const proxyRequest = await request.json();

        if (!proxyRequest.url) {
          return new Response(JSON.stringify({
            error: 'ValidationError:400',
            message: 'URL is required',
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const headers = buildWeiboHeaders(proxyRequest);

        const fetchOptions = {
          method: proxyRequest.method || 'GET',
          headers,
        };

        if (proxyRequest.body && ['POST', 'PUT', 'PATCH'].includes(proxyRequest.method || 'GET')) {
          fetchOptions.body = typeof proxyRequest.body === 'string' ? proxyRequest.body : JSON.stringify(proxyRequest.body);
        }

        const response = await fetch(proxyRequest.url, fetchOptions);
        const responseBody = await response.text();

        return new Response(JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'WeiboProxyError:500',
          message: 'Weibo proxy error',
          details: error.message,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      error: 'Not Found',
      message: 'Endpoint not found',
      availableEndpoints: [
        'GET /health - Health check',
        'POST /weibo-proxy - Weibo专用代理',
      ],
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

部署时直接使用这个单文件版本。
