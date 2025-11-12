#!/usr/bin/env node

import { createHmac } from 'crypto';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET;
const REPO_PATH = process.env.REPO_PATH || '/home/weibo-pro';
const BUILD_SCRIPT = join(__dirname, 'build.sh');

if (!SECRET) {
  console.error('[ERROR] WEBHOOK_SECRET 环境变量未设置');
  process.exit(1);
}

const verifySignature = (payload, signature) => {
  const hmac = createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return signature === digest;
};

const executeBuild = () => {
  return new Promise((resolve, reject) => {
    console.log('[DEPLOY] 开始执行构建...');
    console.log(`[DEPLOY] 工作目录: ${REPO_PATH}`);

    const build = spawn('bash', [BUILD_SCRIPT], {
      cwd: REPO_PATH,
      env: { ...process.env, REPO_PATH },
      stdio: 'pipe'
    });

    build.stdout.on('data', (data) => {
      process.stdout.write(`[BUILD] ${data}`);
    });

    build.stderr.on('data', (data) => {
      process.stderr.write(`[BUILD] ${data}`);
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log('[DEPLOY] ✓ 构建成功');
        resolve();
      } else {
        console.error(`[DEPLOY] ✗ 构建失败，退出码: ${code}`);
        reject(new Error(`构建失败: ${code}`));
      }
    });

    build.on('error', (error) => {
      console.error('[DEPLOY] ✗ 构建进程错误:', error);
      reject(error);
    });
  });
};

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    const signature = req.headers['x-hub-signature-256'];

    if (!signature || !verifySignature(body, signature)) {
      console.error('[SECURITY] 签名验证失败');
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    try {
      const payload = JSON.parse(body);
      const branch = payload.ref?.replace('refs/heads/', '');

      console.log(`[WEBHOOK] 收到推送: ${payload.repository?.full_name} @ ${branch}`);

      if (branch !== 'main') {
        console.log(`[WEBHOOK] 忽略非 main 分支: ${branch}`);
        res.writeHead(200);
        res.end('OK (ignored)');
        return;
      }

      res.writeHead(202);
      res.end('Accepted');

      await executeBuild();
    } catch (error) {
      console.error('[ERROR]', error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[WEBHOOK] 服务启动成功`);
  console.log(`[WEBHOOK] 监听端口: ${PORT}`);
  console.log(`[WEBHOOK] 仓库路径: ${REPO_PATH}`);
  console.log(`[WEBHOOK] 构建脚本: ${BUILD_SCRIPT}`);
});

process.on('SIGTERM', () => {
  console.log('[WEBHOOK] 收到终止信号，优雅退出...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[WEBHOOK] 收到中断信号，优雅退出...');
  server.close(() => process.exit(0));
});
