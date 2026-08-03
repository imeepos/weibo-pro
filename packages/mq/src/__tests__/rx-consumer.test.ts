import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRxConsumer } from '../rx-consumer.js';
import { ConnectionState } from '../types.js';
import type { ConnectionPool } from '../connection-pool.js';

interface MockConsumeMessage {
  content: Buffer;
  properties: {
    messageId?: string;
    correlationId?: string;
    timestamp?: number;
    headers?: Record<string, unknown>;
  };
}

let consumeCallback: ((msg: MockConsumeMessage | null) => void) | null = null;

function createMockChannel() {
  consumeCallback = null;
  return {
    assertQueue: vi.fn().mockResolvedValue({}),
    prefetch: vi.fn().mockResolvedValue(undefined),
    consume: vi
      .fn()
      .mockImplementation(
        (_queue: string, cb: (msg: MockConsumeMessage | null) => void) => {
          consumeCallback = cb;
          return Promise.resolve({ consumerTag: 'tag-1' });
        },
      ),
    cancel: vi.fn().mockResolvedValue(undefined),
    ack: vi.fn(),
    nack: vi.fn(),
  };
}

function createMockPool(channel = createMockChannel()) {
  return {
    isConnected: vi.fn().mockReturnValue(true),
    getChannel: vi.fn().mockReturnValue(channel),
    getState: vi.fn().mockReturnValue(ConnectionState.CONNECTED),
  } as unknown as ConnectionPool;
}

function triggerMessage(msg: MockConsumeMessage) {
  if (!consumeCallback) {
    throw new Error('consume callback not registered');
  }
  consumeCallback(msg);
}

function createMessage(body: unknown, props: MockConsumeMessage['properties'] = {}) {
  return {
    content: Buffer.from(JSON.stringify(body)),
    properties: props,
  };
}

describe('createRxConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('订阅与队列声明', () => {
    it('订阅后调用 assertQueue/prefetch/consume', async () => {
      const channel = createMockChannel();
      const observable = createRxConsumer(createMockPool(channel), 'jobs');

      observable.subscribe();

      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());
      expect(channel.assertQueue).toHaveBeenCalledWith('jobs', { durable: true });
      expect(channel.prefetch).toHaveBeenCalledWith(1);
      expect(channel.consume).toHaveBeenCalledWith(
        'jobs',
        expect.any(Function),
        { noAck: false, consumerTag: undefined },
      );
    });

    it('queueOptions 自定义字段转换为 RabbitMQ 标准参数', async () => {
      const channel = createMockChannel();
      const queueOptions = {
        durable: true,
        messageTtl: 1800000,
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'dlq-key',
      };

      const observable = createRxConsumer(
        createMockPool(channel),
        'jobs',
        {},
        queueOptions,
      );
      observable.subscribe();

      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());
      expect(channel.assertQueue).toHaveBeenCalledWith('jobs', {
        durable: true,
        arguments: {
          'x-message-ttl': 1800000,
          'x-dead-letter-exchange': 'dlx',
          'x-dead-letter-routing-key': 'dlq-key',
        },
      });
    });

    it('preset prefetchCount 与 consumerTag 生效', async () => {
      const channel = createMockChannel();
      const observable = createRxConsumer(createMockPool(channel), 'jobs', {
        prefetchCount: 10,
        consumerTag: 'my-tag',
      });

      observable.subscribe();

      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());
      expect(channel.prefetch).toHaveBeenCalledWith(10);
      expect(channel.consume).toHaveBeenCalledWith(
        'jobs',
        expect.any(Function),
        { noAck: false, consumerTag: 'my-tag' },
      );
    });
  });

  describe('消息投递', () => {
    it('解析 JSON 并投递 MessageEnvelope（含 message/metadata/retryCount）', async () => {
      const channel = createMockChannel();
      const next = vi.fn();
      const observable = createRxConsumer(createMockPool(channel), 'jobs');

      observable.subscribe({ next });
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      const msg = createMessage(
        { keyword: 'AI', page: 2 },
        {
          messageId: 'm1',
          correlationId: 'c1',
          timestamp: 123,
          headers: { 'x-retry-count': 2 },
        },
      );
      triggerMessage(msg);

      expect(next).toHaveBeenCalledTimes(1);
      const envelope = next.mock.calls[0]![0];
      expect(envelope.message).toEqual({ keyword: 'AI', page: 2 });
      expect(envelope.metadata).toEqual({
        messageId: 'm1',
        correlationId: 'c1',
        timestamp: 123,
        retryCount: 2,
        properties: msg.properties,
      });
      expect(typeof envelope.ack).toBe('function');
      expect(typeof envelope.nack).toBe('function');
    });

    it('无 x-retry-count 头时 retryCount 默认为 0', async () => {
      const channel = createMockChannel();
      const next = vi.fn();
      const observable = createRxConsumer(createMockPool(channel), 'jobs');

      observable.subscribe({ next });
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      triggerMessage(createMessage({ a: 1 }, { messageId: 'm1' }));

      expect(next.mock.calls[0]![0].metadata.retryCount).toBe(0);
    });
  });

  describe('ACK/NACK 模式', () => {
    it('manualAck 默认 false 时自动 ack', async () => {
      const channel = createMockChannel();
      const observable = createRxConsumer(createMockPool(channel), 'jobs');

      observable.subscribe();
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      const msg = createMessage({ a: 1 });
      triggerMessage(msg);

      expect(channel.ack).toHaveBeenCalledWith(msg);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it('manualAck=true 时不会自动 ack，ack 手动控制且幂等', async () => {
      const channel = createMockChannel();
      const next = vi.fn();
      const observable = createRxConsumer(createMockPool(channel), 'jobs', {
        manualAck: true,
      });

      observable.subscribe({ next });
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      const msg = createMessage({ a: 1 });
      triggerMessage(msg);

      expect(channel.ack).not.toHaveBeenCalled();

      const envelope = next.mock.calls[0]![0];
      envelope.ack();
      envelope.ack();
      expect(channel.ack).toHaveBeenCalledTimes(1);

      // 已 ack 后 nack 被忽略（幂等保护）
      envelope.nack(true);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it('manualAck=true 时 nack 手动控制且幂等', async () => {
      const channel = createMockChannel();
      const next = vi.fn();
      const observable = createRxConsumer(createMockPool(channel), 'jobs', {
        manualAck: true,
      });

      observable.subscribe({ next });
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      const msg = createMessage({ a: 1 });
      triggerMessage(msg);

      const envelope = next.mock.calls[0]![0];
      envelope.nack(true);
      envelope.nack(false);
      expect(channel.nack).toHaveBeenCalledTimes(1);
      expect(channel.nack).toHaveBeenCalledWith(msg, false, true);

      // 已 nack 后 ack 被忽略
      envelope.ack();
      expect(channel.ack).not.toHaveBeenCalled();
    });

    it('JSON 解析失败时自动 nack requeue=true', async () => {
      const channel = createMockChannel();
      const next = vi.fn();
      const observable = createRxConsumer(createMockPool(channel), 'jobs');

      observable.subscribe({ next });
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      const msg = { content: Buffer.from('not-json{'), properties: {} };
      triggerMessage(msg);

      expect(next).not.toHaveBeenCalled();
      expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
      expect(channel.ack).not.toHaveBeenCalled();
    });
  });

  describe('取消订阅', () => {
    it('取消订阅时调用 channel.cancel(consumerTag)', async () => {
      const channel = createMockChannel();
      const observable = createRxConsumer(createMockPool(channel), 'jobs');

      const subscription = observable.subscribe();
      await vi.waitFor(() => expect(channel.consume).toHaveBeenCalled());

      subscription.unsubscribe();
      await vi.waitFor(() => expect(channel.cancel).toHaveBeenCalled());
      expect(channel.cancel).toHaveBeenCalledWith('tag-1');
    });
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
