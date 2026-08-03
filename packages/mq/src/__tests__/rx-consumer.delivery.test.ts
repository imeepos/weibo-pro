import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRxConsumer } from '../rx-consumer.js';
import { createMockChannel, createMockPool, triggerMessage, createMessage } from './rx-consumer.fixtures';

describe('createRxConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
