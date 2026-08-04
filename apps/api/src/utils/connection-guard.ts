import type { Socket } from 'socket.io';

/**
 * Socket.IO 连接守卫
 *
 * 背景：Socket.IO 默认无连接数上限，异常/恶意客户端可无限建立连接，
 * 配合 claude.service 的 clientSockets/clientConnections Map 持续累积内存。
 * 在 server 层统一加连接上限，一处防护覆盖 /ws 与 /worker 两个命名空间。
 */
export interface ConnectionGuardOptions {
  /** 允许的最大并发连接数 */
  maxConnections: number;
  /** 连接被拒绝时的回调（用于日志） */
  onRejected?: (socket: Socket) => void;
}

export function createConnectionGuard(opts: ConnectionGuardOptions) {
  const { maxConnections, onRejected } = opts;
  const activeSockets = new Set<string>();
  let count = 0;

  return {
    /** 接受新连接；超限时断开并返回 false */
    accept(socket: Socket): boolean {
      if (count >= maxConnections) {
        onRejected?.(socket);
        socket.disconnect(true);
        return false;
      }
      activeSockets.add(socket.id);
      count++;
      return true;
    },

    /** 连接断开时释放名额 */
    release(socket: Socket): void {
      if (activeSockets.delete(socket.id)) {
        count--;
      }
    },

    /** 当前活跃连接数 */
    get count(): number {
      return count;
    },
  };
}
