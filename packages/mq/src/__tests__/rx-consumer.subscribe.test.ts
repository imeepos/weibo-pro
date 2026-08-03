import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRxConsumer } from '../rx-consumer.js';
import { createMockChannel, createMockPool } from './rx-consumer.fixtures';

describe('createRxConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
