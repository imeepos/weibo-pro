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

  describe('sorted set operations', () => {
    it('should return the result of zadd', async () => {
      mockClient.zadd.mockResolvedValue(1);
      await expect(client.zadd('key', 10, 'member')).resolves.toBe(1);
      expect(mockClient.zadd).toHaveBeenCalledWith('key', 10, 'member');
    });

    it('should parse zincrby result as float', async () => {
      mockClient.zincrby.mockResolvedValue('3.5');
      await expect(client.zincrby('key', 2, 'member')).resolves.toBe(3.5);
    });

    it('should return null when zscore returns null', async () => {
      mockClient.zscore.mockResolvedValue(null);
      await expect(client.zscore('key', 'member')).resolves.toBeNull();
    });

    it('should return null when zscore returns undefined', async () => {
      mockClient.zscore.mockResolvedValue(undefined);
      await expect(client.zscore('key', 'member')).resolves.toBeNull();
    });

    it('should return null when zscore returns NaN string', async () => {
      mockClient.zscore.mockResolvedValue('NaN');
      await expect(client.zscore('key', 'member')).resolves.toBeNull();
    });

    it('should parse a numeric zscore', async () => {
      mockClient.zscore.mockResolvedValue('10.25');
      await expect(client.zscore('key', 'member')).resolves.toBe(10.25);
    });

    it('should call zrangebyscore without WITHSCORES', async () => {
      mockClient.zrangebyscore.mockResolvedValue(['a', 'b']);
      await client.zrangebyscore('key', 0, 100);
      expect(mockClient.zrangebyscore).toHaveBeenCalledWith('key', 0, 100);
    });

    it('should pass WITHSCORES when requested', async () => {
      mockClient.zrangebyscore.mockResolvedValue(['a', '1', 'b', '2']);
      await client.zrangebyscore('key', 0, 100, true);
      expect(mockClient.zrangebyscore).toHaveBeenCalledWith('key', 0, 100, 'WITHSCORES');
    });

    it('should return [] when zrangebyscore rejects', async () => {
      mockClient.zrangebyscore.mockRejectedValue(new Error('boom'));
      await expect(client.zrangebyscore('key', 0, 100)).resolves.toEqual([]);
    });

    it('should return the result of zremrangebyscore', async () => {
      mockClient.zremrangebyscore.mockResolvedValue(2);
      await expect(client.zremrangebyscore('key', 0, 100)).resolves.toBe(2);
    });

    it('should call zrange with stringified bounds', async () => {
      mockClient.zrange.mockResolvedValue(['a']);
      await client.zrange('key', 0, -1);
      expect(mockClient.zrange).toHaveBeenCalledWith('key', '0', '-1');
    });

    it('should pass WITHSCORES to zrange when requested', async () => {
      mockClient.zrange.mockResolvedValue(['a', '1']);
      await client.zrange('key', 0, -1, true);
      expect(mockClient.zrange).toHaveBeenCalledWith('key', '0', '-1', 'WITHSCORES');
    });

    it('should return [] when zrange rejects', async () => {
      mockClient.zrange.mockRejectedValue(new Error('boom'));
      await expect(client.zrange('key', 0, -1)).resolves.toEqual([]);
    });

    it('should call zrevrange without WITHSCORES', async () => {
      mockClient.zrevrange.mockResolvedValue(['a']);
      await client.zrevrange('key', 0, -1);
      expect(mockClient.zrevrange).toHaveBeenCalledWith('key', 0, -1);
    });

    it('should pass WITHSCORES to zrevrange when requested', async () => {
      mockClient.zrevrange.mockResolvedValue(['a', '1']);
      await client.zrevrange('key', 0, -1, true);
      expect(mockClient.zrevrange).toHaveBeenCalledWith('key', 0, -1, 'WITHSCORES');
    });

    it('should return [] when zrevrange rejects', async () => {
      mockClient.zrevrange.mockRejectedValue(new Error('boom'));
      await expect(client.zrevrange('key', 0, -1)).resolves.toEqual([]);
    });

    it('should return the result of zcard', async () => {
      mockClient.zcard.mockResolvedValue(5);
      await expect(client.zcard('key')).resolves.toBe(5);
    });

    it('should return null when zpopmax result has fewer than 2 elements', async () => {
      mockClient.zpopmax.mockResolvedValue([]);
      await expect(client.zpopmax('key')).resolves.toBeNull();
      mockClient.zpopmax.mockResolvedValue(['member']);
      await expect(client.zpopmax('key')).resolves.toBeNull();
    });

    it('should return member and numeric score from zpopmax', async () => {
      mockClient.zpopmax.mockResolvedValue(['member', '10.5']);
      await expect(client.zpopmax('key')).resolves.toEqual({ member: 'member', score: 10.5 });
    });

    it('should accept a numeric score from zpopmax', async () => {
      mockClient.zpopmax.mockResolvedValue(['member', 20]);
      await expect(client.zpopmax('key')).resolves.toEqual({ member: 'member', score: 20 });
    });

    it('should coerce an unparsable zpopmax score to 0', async () => {
      mockClient.zpopmax.mockResolvedValue(['member', 'abc']);
      await expect(client.zpopmax('key')).resolves.toEqual({ member: 'member', score: 0 });
    });

    it('should return the result of zrem', async () => {
      mockClient.zrem.mockResolvedValue(1);
      await expect(client.zrem('key', 'member')).resolves.toBe(1);
      expect(mockClient.zrem).toHaveBeenCalledWith('key', 'member');
    });
  });
});
