import { RedisClient } from "@sker/redis";
import { generateId } from "@sker/workflow";
import {
  WeiboLoginEvent,
  WeiboLoginSessionSnapshot,
} from "./weibo-login.types";

/**
 * 在 Redis 中创建登录会话记录
 * @param redis Redis 客户端
 * @param userId 用户 ID
 * @param sessionTimeout 会话超时时间（毫秒）
 */
export async function createSessionInRedis(
  redis: RedisClient,
  userId: string,
  sessionTimeout: number,
): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + sessionTimeout);

  const sessionData = {
    userId,
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  await redis.set(`weibo_session:${sessionId}`, sessionData, Math.ceil(sessionTimeout / 1000));

  return { sessionId, expiresAt };
}

/**
 * 更新会话最近事件
 */
export async function updateSessionEventInRedis(
  redis: RedisClient,
  sessionId: string,
  event: WeiboLoginEvent,
): Promise<void> {
  const key = `weibo_session:${sessionId}`;
  const sessionData = await redis.get<WeiboLoginSessionSnapshot>(key);

  if (sessionData) {
    sessionData.lastEvent = event;
    await redis.set(key, sessionData);
  }
}

/**
 * 更新会话状态
 */
export async function updateSessionStatusInRedis(
  redis: RedisClient,
  sessionId: string,
  status: string,
): Promise<void> {
  const key = `weibo_session:${sessionId}`;
  const sessionData = await redis.get<WeiboLoginSessionSnapshot>(key);

  if (sessionData) {
    sessionData.status = status as any;
    await redis.set(key, sessionData);
  }
}
