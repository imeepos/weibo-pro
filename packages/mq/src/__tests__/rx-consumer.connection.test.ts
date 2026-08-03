import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRxConsumer } from '../rx-consumer.js';
import { ConnectionState } from '../types.js';
import { createMockChannel } from './rx-consumer.fixtures';
import type { ConnectionPool } from '../connection-pool.js';

describe('createRxConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('连接等待失败', () => {
    it('连接不可用（ERROR 状态）时 Observable 抛出 error', async () => {
      const channel = createMockChannel();
      const pool = {
        isConnected: vi.fn().mockReturnValue(false),
        getState: vi.fn().mockReturnValue(ConnectionState.ERROR),
        getChannel: vi.fn().mockReturnValue(channel),
      } as unknown as ConnectionPool;

      const error = vi.fn();
      createRxConsumer(pool, 'jobs').subscribe({ error });

      await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
      expect(error.mock.calls[0]![0]).toBeInstanceOf(Error);
      expect((error.mock.calls[0]![0] as Error).message).toMatch(/连接不可用/);
    });

    it('waitForConnection 超时时 Observable 抛出 error', async () => {
      vi.useFakeTimers();
      const channel = createMockChannel();
      const pool = {
        isConnected: vi.fn().mockReturnValue(false),
        getState: vi.fn().mockReturnValue(ConnectionState.CONNECTED),
        getChannel: vi.fn().mockReturnValue(channel),
      } as unknown as ConnectionPool;

      const error = vi.fn();
      createRxConsumer(pool, 'jobs').subscribe({ error });

      // 默认超时 120000ms，推进超过该值
      await vi.advanceTimersByTimeAsync(120100);

      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]![0]).toBeInstanceOf(Error);
      expect((error.mock.calls[0]![0] as Error).message).toMatch(
        /RabbitMQ 连接超时/,
      );
    });

    it('超时且 channel 为 null 时仍抛出超时错误（不因 getChannel 抛错掩盖）', async () => {
      vi.useFakeTimers();
      const pool = {
        isConnected: vi.fn().mockReturnValue(false),
        getState: vi.fn().mockReturnValue(ConnectionState.CONNECTED),
        getChannel: vi.fn().mockImplementation(() => {
          throw new Error('通道不可用，连接未建立');
        }),
      } as unknown as ConnectionPool;

      const error = vi.fn();
      createRxConsumer(pool, 'jobs').subscribe({ error });

      await vi.advanceTimersByTimeAsync(120100);

      expect(error).toHaveBeenCalledTimes(1);
      expect((error.mock.calls[0]![0] as Error).message).toMatch(
        /RabbitMQ 连接超时/,
      );
    });
  });
});
