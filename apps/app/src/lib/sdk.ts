/**
 * SDK 配置
 */

import { createAuthClient } from 'better-auth/client';
import { createSkerClientPlugin } from '@sker/sdk';

function getBaseUrl() {
  const url = new URL(window.location.href);
  if (url.port) {
    return `${url.protocol}//${url.hostname}:${url.port}`;
  }
  return `${url.protocol}//${url.hostname}`;
}

const baseURL = getBaseUrl();

/**
 * 使用 Better Auth 插件初始化 SDK
 * 插件会自动执行李代桃僵，将所有 Controller 注册到 DI 容器
 */
export const auth = createAuthClient({
  baseURL,
  plugins: [createSkerClientPlugin()],
});
