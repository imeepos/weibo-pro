import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';
import { createConnectionGuard } from './connection-guard';

type MockSocket = {
  id: string;
  disconnect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

function makeSocket(overrides: Partial<MockSocket> = {}): MockSocket {
  return {
    id: `socket-${Math.random()}`,
    disconnect: vi.fn(),
    on: vi.fn(),
    ...overrides,
  };
}

describe('createConnectionGuard', () => {
  let guard: ReturnType<typeof createConnectionGuard>;
  let maxedLogger: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    maxedLogger = vi.fn();
    guard = createConnectionGuard({ maxConnections: 2, onRejected: maxedLogger as never });
  });

  const asSocket = (s: MockSocket): Socket => s as unknown as Socket;

  it('未超限时接受连接并正常注册', () => {
    const s1 = makeSocket();
    const s2 = makeSocket();

    expect(guard.accept(asSocket(s1))).toBe(true);
    expect(guard.accept(asSocket(s2))).toBe(true);
    expect(s1.disconnect).not.toHaveBeenCalled();
    expect(s2.disconnect).not.toHaveBeenCalled();
  });

  it('超过上限时拒绝新连接并断开', () => {
    const s1 = makeSocket();
    const s2 = makeSocket();
    const s3 = makeSocket();

    guard.accept(asSocket(s1));
    guard.accept(asSocket(s2));
    expect(guard.accept(asSocket(s3))).toBe(false);
    expect(s3.disconnect).toHaveBeenCalled();
    expect(maxedLogger).toHaveBeenCalledTimes(1);
  });

  it('连接断开后释放名额，可再次接受新连接', () => {
    const s1 = makeSocket();
    const s2 = makeSocket();
    const s3 = makeSocket();
    const s4 = makeSocket();

    guard.accept(asSocket(s1));
    guard.accept(asSocket(s2));
    expect(guard.accept(asSocket(s3))).toBe(false);

    // s1 断开，释放名额
    guard.release(asSocket(s1));
    expect(guard.accept(asSocket(s4))).toBe(true);
  });

  it('释放未知连接时不影响计数', () => {
    const s1 = makeSocket();
    guard.accept(asSocket(s1));
    guard.release(asSocket(makeSocket())); // 未注册的连接
    // 上限为 2，仍可再接受 1 个
    const s2 = makeSocket();
    const s3 = makeSocket();
    expect(guard.accept(asSocket(s2))).toBe(true);
    expect(guard.accept(asSocket(s3))).toBe(false); // 达到上限
  });
});
