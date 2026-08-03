import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGracefulShutdown } from './graceful-shutdown';

describe('createGracefulShutdown', () => {
  let server: { close: ReturnType<typeof vi.fn> };
  let io: { close: ReturnType<typeof vi.fn> };
  let exitSpy: ReturnType<typeof vi.fn>;
  let logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let closeCallback: () => void;

  function create(opts?: Partial<{ exit: ReturnType<typeof vi.fn>; forceExitTimeoutMs: number }>) {
    return createGracefulShutdown({
      server: server as never,
      io: io as never,
      logger: logger as never,
      ...opts,
    } as never);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    closeCallback = vi.fn();
    server = {
      close: vi.fn((cb: () => void) => { closeCallback = cb; }),
    };
    io = {
      close: vi.fn((cb?: () => void) => cb?.()),
    };
    exitSpy = vi.fn();
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SIGTERM 触发时先关闭 server/io，再退出（不直接 process.exit）', () => {
    const shutdown = create({ exit: exitSpy });

    shutdown();

    // 先优雅关闭，而非立即退出
    expect(exitSpy).not.toHaveBeenCalled();
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(io.close).toHaveBeenCalledTimes(1);

    // server 关闭完成后再退出
    closeCallback();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('server 长时间不关闭时，超时后强制退出（防止挂死）', () => {
    const shutdown = create({ exit: exitSpy, forceExitTimeoutMs: 10_000 });

    shutdown();
    expect(exitSpy).not.toHaveBeenCalled();

    // 超过兜底超时仍未关闭 → 强制退出
    vi.advanceTimersByTime(10_001);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('多次触发只执行一次（幂等）', () => {
    const shutdown = create({ exit: exitSpy });

    shutdown();
    shutdown();
    shutdown();

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();

    closeCallback();
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });
});
