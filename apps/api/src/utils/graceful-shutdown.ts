/**
 * 优雅退出工具
 *
 * 背景：main.ts 原先在 SIGTERM/SIGINT 时直接 process.exit(0)，
 * 会粗暴中断在途 HTTP 请求、Socket.IO 连接与未完成的清理任务。
 * Docker 滚动部署/重启时触发 SIGTERM，直接退出会造成请求失败与连接重置。
 *
 * 策略：先停止接收新连接（server.close），关闭 Socket.IO，等待在途请求
 * 处理完成后再退出；若迟迟无法关闭（如挂死的长连接），用兜底定时器强制退出，
 * 避免进程永久挂起。
 */
export interface ShutdownTarget {
  /** HTTP server：close 后停止接受新连接，并等待已建立的连接结束 */
  close(callback?: (err?: Error) => void): void;
}

export interface GracefulShutdownOptions {
  server: ShutdownTarget;
  io?: { close(callback?: () => void): void };
  logger: { info(msg: string): void; warn(msg: string): void };
  /** 测试注入，默认 process.exit */
  exit?: (code: number) => void;
  /** 兜底强制退出超时（ms），默认 10s */
  forceExitTimeoutMs?: number;
}

export function createGracefulShutdown(opts: GracefulShutdownOptions): () => void {
  const {
    server,
    io,
    logger,
    exit = (code: number) => process.exit(code),
    forceExitTimeoutMs = 10_000,
  } = opts;

  let shuttingDown = false;

  return () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info('收到退出信号，正在优雅关闭...');

    // 停止接收新连接
    server.close((err) => {
      if (err) {
        logger.warn(`HTTP server 关闭异常: ${err.message}`);
      }
      exit(0);
    });

    // 关闭 Socket.IO（断开客户端连接）
    try {
      io?.close();
    } catch (err) {
      logger.warn(`Socket.IO 关闭异常: ${(err as Error).message}`);
    }

    // 兜底：若 server 迟迟无法关闭（长连接挂死），超时后强制退出，避免进程挂起
    const forceTimer = setTimeout(() => {
      logger.warn(`优雅关闭超时（${forceExitTimeoutMs}ms），强制退出`);
      exit(1);
    }, forceExitTimeoutMs);
    forceTimer.unref?.();
  };
}
