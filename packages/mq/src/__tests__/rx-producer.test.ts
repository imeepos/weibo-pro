import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RxQueueProducer } from '../rx-producer.js';
import type { ConnectionPool } from '../connection-pool.js';

function createMockChannel() {
  return {
    sendToQueue: vi.fn().mockReturnValue(true),
    assertQueue: vi.fn().mockResolvedValue({}),
  };
}

function createMockPool(channel = createMockChannel()) {
  return {
    waitForConnection: vi.fn().mockResolvedValue(undefined),
    getChannel: vi.fn().mockReturnValue(channel),
  } as unknown as ConnectionPool;
}

describe('RxQueueProducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('next() 单条发布', () => {
    it('调用 sendToQueue，JSON 序列化正确，options 正确透传', async () => {
      const channel = createMockChannel();
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      producer.next(
        { keyword: 'AI', page: 1 },
        {
          persistent: true,
          priority: 5,
          expiration: 1000,
          messageId: 'm-1',
          correlationId: 'c-1',
        },
      );

      await vi.waitFor(() => {
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      });

      // 发送前确保队列已声明
      expect(channel.assertQueue).toHaveBeenCalledWith('jobs', {
        durable: true,
        passive: false,
      });

      const [queue, buffer, options] = channel.sendToQueue.mock.calls[0]!;
      expect(queue).toBe('jobs');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe(JSON.stringify({ keyword: 'AI', page: 1 }));
      expect(options).toEqual({
        persistent: true,
        priority: 5,
        expiration: '1000',
        messageId: 'm-1',
        correlationId: 'c-1',
        timestamp: expect.any(Number),
      });
    });

    it('未传 options 时默认持久化，expiration/priority 为空', async () => {
      const channel = createMockChannel();
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      producer.next({ foo: 'bar' });

      await vi.waitFor(() => {
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      });

      const options = channel.sendToQueue.mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(options.persistent).toBe(true);
      expect(options.expiration).toBeUndefined();
      expect(options.priority).toBeUndefined();
      expect(options.messageId).toBeUndefined();
      expect(options.correlationId).toBeUndefined();
      expect(typeof options.timestamp).toBe('number');
    });

    it('persistent: false 会被透传', async () => {
      const channel = createMockChannel();
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      producer.next({ a: 1 }, { persistent: false });

      await vi.waitFor(() => {
        expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      });

      const options = channel.sendToQueue.mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(options.persistent).toBe(false);
    });

    it('发布失败（连接不可用）不会同步抛出', async () => {
      const pool = {
        waitForConnection: vi.fn().mockRejectedValue(new Error('no conn')),
        getChannel: vi.fn(),
      } as unknown as ConnectionPool;
      const producer = new RxQueueProducer(pool, 'jobs');

      expect(() => producer.next({ a: 1 })).not.toThrow();

      await vi.waitFor(() => {
        expect(pool.waitForConnection).toHaveBeenCalled();
      });
    });
  });

  describe('nextBatch() 批量发布', () => {
    it('返回批量发布统计结果', async () => {
      const channel = createMockChannel();
      // 0 成功、1 失败、2 成功
      channel.sendToQueue
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      const result = await producer.nextBatch([{ a: 1 }, { b: 2 }, { c: 3 }]);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failedIndices).toEqual([1]);
      expect(typeof result.totalTimeMs).toBe('number');
      expect(channel.sendToQueue).toHaveBeenCalledTimes(3);
      expect(channel.assertQueue).toHaveBeenCalled();
    });

    it('sendToQueue 抛错时计入失败', async () => {
      const channel = createMockChannel();
      channel.sendToQueue.mockImplementation(() => {
        throw new Error('write fail');
      });
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      const result = await producer.nextBatch([{ a: 1 }, { b: 2 }]);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
      expect(result.failedIndices).toEqual([0, 1]);
    });

    it('批量消息 JSON 序列化正确', async () => {
      const channel = createMockChannel();
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      await producer.nextBatch([{ name: 'x' }]);

      const buffer = channel.sendToQueue.mock.calls[0]![1] as Buffer;
      expect(buffer.toString()).toBe(JSON.stringify({ name: 'x' }));
    });

    it('waitForConnection 失败时抛出错误', async () => {
      const pool = {
        waitForConnection: vi.fn().mockRejectedValue(new Error('no conn')),
        getChannel: vi.fn(),
      } as unknown as ConnectionPool;
      const producer = new RxQueueProducer(pool, 'jobs');

      await expect(producer.nextBatch([{ a: 1 }])).rejects.toThrow('no conn');
    });
  });

  describe('closed 状态', () => {
    it('complete() 后 next() 忽略消息，nextBatch() 抛错', async () => {
      const channel = createMockChannel();
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      producer.complete();

      producer.next({ a: 1 });
      expect(channel.sendToQueue).not.toHaveBeenCalled();

      await expect(producer.nextBatch([{ a: 1 }])).rejects.toThrow(
        /生产者已关闭/,
      );
    });

    it('error() 后生产者关闭', async () => {
      const channel = createMockChannel();
      const producer = new RxQueueProducer(createMockPool(channel), 'jobs');

      producer.error(new Error('boom'));

      producer.next({ a: 1 });
      expect(channel.sendToQueue).not.toHaveBeenCalled();

      await expect(producer.nextBatch([{ a: 1 }])).rejects.toThrow(
        /生产者已关闭/,
      );
    });
  });
});
