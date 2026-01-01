import type { Context } from 'hono';
import { Logger, root } from '@sker/core';
import { BETTER_AUTH } from '@sker/auth';

/**
 * 认证中间件 - 验证 Better Auth session
 */
export async function authMiddleware(c: Context, next: () => Promise<void>) {
  const logger = root.get(Logger);
  const auth = root.get(BETTER_AUTH);

  try {
    // 从请求中获取 session
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        401
      );
    }

    // 将 session 存储到 context 中供后续使用
    c.set('session', session);
    c.set('user', session.user);

    await next();
  } catch (error) {
    logger.error('❌ 认证失败', error);
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or expired session',
      },
      401
    );
  }
}

/**
 * 可选认证中间件 - session 存在时验证，不存在时继续
 */
export async function optionalAuthMiddleware(c: Context, next: () => Promise<void>) {
  const auth = root.get(BETTER_AUTH);

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session) {
      c.set('session', session);
      c.set('user', session.user);
    }
  } catch {
    // 忽略错误，继续执行
  }

  await next();
}
