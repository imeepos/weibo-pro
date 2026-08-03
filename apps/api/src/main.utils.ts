import type { IncomingMessage } from 'http';

/**
 * 读取请求体
 */
export function getRequestBody(req: IncomingMessage): Promise<BodyInit | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(null));
  });
}

/**
 * 映射消息类型到前端期望的事件名
 */
export function getEventName(message: any): string {
  switch (message.type) {
    case 'update':
      return 'data:update';
    case 'alert':
      return 'data:alert';
    case 'heartbeat':
      return 'data:heartbeat';
    case 'connection':
      return 'data:connection';
    default:
      return 'data:update';
  }
}
