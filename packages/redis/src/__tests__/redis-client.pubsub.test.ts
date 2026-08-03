import { describe, it, expect, vi, beforeEach } from 'vitest';

const { RedisMock } = vi.hoisted(() => ({ RedisMock: vi.fn() }));

vi.mock('ioredis', () => ({
  Redis: RedisMock,
  ChainableCommander: class {},
}));

import { RedisClient, RedisPipeline } from '../index';
import { createMockClient, createMockPipeline } from './redis-client.fixtures';

describe('RedisClient', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let client: RedisClient;

  beforeEach(() => {
    mockClient = createMockClient();
    (RedisMock as any).mockImplementation(function () {
      return mockClient;
    });
    client = new RedisClient(mockClient as any);
  });

  describe('subscribe', () => {
    it('should subscribe on a second Redis instance and return a cancel function', () => {
      const subscriber = createMockClient();
      (RedisMock as any).mockImplementation(function () {
        return subscriber;
      });
      const callback = vi.fn();

      const cancel = client.subscribe('news', callback);

      expect(RedisMock).toHaveBeenCalledWith(mockClient.options);
      expect(subscriber.subscribe).toHaveBeenCalledWith('news');
      expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(typeof cancel).toBe('function');

      const handler = subscriber.on.mock.calls[0]![1];
      handler('news', 'hello');
      expect(callback).toHaveBeenCalledWith('news', 'hello');

      handler('sports', 'ignored');
      expect(callback).toHaveBeenCalledTimes(1);

      cancel();
      expect(subscriber.unsubscribe).toHaveBeenCalledWith('news');
      expect(subscriber.quit).toHaveBeenCalled();
    });

    it('should filter messages to the subscribed channel', () => {
      const subscriber = createMockClient();
      (RedisMock as any).mockImplementation(function () {
        return subscriber;
      });
      const callback = vi.fn();

      client.subscribe('news', callback);

      const handler = subscriber.on.mock.calls[0]![1];
      handler('other', 'x');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('pipeline', () => {
    it('should return a RedisPipeline wrapping the client pipeline', () => {
      const mockPipeline = createMockPipeline();
      mockClient.pipeline.mockReturnValue(mockPipeline);

      const result = client.pipeline();

      expect(mockClient.pipeline).toHaveBeenCalled();
      expect(result).toBeInstanceOf(RedisPipeline);
    });
  });
});
