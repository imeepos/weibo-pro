import { describe, it, expect, vi, beforeEach } from 'vitest';

const { RedisMock } = vi.hoisted(() => ({ RedisMock: vi.fn() }));

vi.mock('ioredis', () => ({
  Redis: RedisMock,
  ChainableCommander: class {},
}));

import { RedisClient } from '../index';
import { createMockClient } from './redis-client.fixtures';

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

  describe('set operations', () => {
    it('should call sadd with members', async () => {
      mockClient.sadd.mockResolvedValue(3);
      await expect(client.sadd('key', 'a', 'b', 'c')).resolves.toBe(3);
      expect(mockClient.sadd).toHaveBeenCalledWith('key', 'a', 'b', 'c');
    });

    it('should return true when sismember returns 1', async () => {
      mockClient.sismember.mockResolvedValue(1);
      await expect(client.sismember('key', 'a')).resolves.toBe(true);
    });

    it('should return false when sismember returns 0', async () => {
      mockClient.sismember.mockResolvedValue(0);
      await expect(client.sismember('key', 'a')).resolves.toBe(false);
    });

    it('should call srem with members', async () => {
      mockClient.srem.mockResolvedValue(2);
      await expect(client.srem('key', 'a', 'b')).resolves.toBe(2);
      expect(mockClient.srem).toHaveBeenCalledWith('key', 'a', 'b');
    });

    it('should return scard result', async () => {
      mockClient.scard.mockResolvedValue(4);
      await expect(client.scard('key')).resolves.toBe(4);
    });

    it('should return smembers result', async () => {
      mockClient.smembers.mockResolvedValue(['a', 'b']);
      await expect(client.smembers('key')).resolves.toEqual(['a', 'b']);
    });
  });

  describe('list operations', () => {
    it('should call lpush with elements', async () => {
      mockClient.lpush.mockResolvedValue(2);
      await expect(client.lpush('key', 'a', 'b')).resolves.toBe(2);
      expect(mockClient.lpush).toHaveBeenCalledWith('key', 'a', 'b');
    });

    it('should return lrange result', async () => {
      mockClient.lrange.mockResolvedValue(['a', 'b']);
      await expect(client.lrange('key', 0, -1)).resolves.toEqual(['a', 'b']);
      expect(mockClient.lrange).toHaveBeenCalledWith('key', 0, -1);
    });

    it('should return ltrim result', async () => {
      mockClient.ltrim.mockResolvedValue('OK');
      await expect(client.ltrim('key', 0, 1)).resolves.toBe('OK');
      expect(mockClient.ltrim).toHaveBeenCalledWith('key', 0, 1);
    });
  });

  describe('keys', () => {
    it('should return keys result', async () => {
      mockClient.keys.mockResolvedValue(['a', 'b']);
      await expect(client.keys('pattern:*')).resolves.toEqual(['a', 'b']);
      expect(mockClient.keys).toHaveBeenCalledWith('pattern:*');
    });
  });

  describe('publish', () => {
    it('should call publish and return the subscriber count', async () => {
      mockClient.publish.mockResolvedValue(1);
      await expect(client.publish('channel', 'msg')).resolves.toBe(1);
      expect(mockClient.publish).toHaveBeenCalledWith('channel', 'msg');
    });
  });
});
