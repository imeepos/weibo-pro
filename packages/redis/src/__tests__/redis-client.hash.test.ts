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

  describe('hash operations', () => {
    it('should call hmset with the given data', async () => {
      mockClient.hmset.mockResolvedValue('OK');
      await client.hmset('key', { a: '1' });
      expect(mockClient.hmset).toHaveBeenCalledWith('key', { a: '1' });
    });

    it('should store string hset values as-is', async () => {
      mockClient.hset.mockResolvedValue(1);
      await client.hset('key', 'field', 'value');
      expect(mockClient.hset).toHaveBeenCalledWith('key', 'field', 'value');
    });

    it('should JSON.stringify non-string hset values', async () => {
      mockClient.hset.mockResolvedValue(1);
      await client.hset('key', 'field', { a: 1 });
      expect(mockClient.hset).toHaveBeenCalledWith('key', 'field', '{"a":1}');
    });

    it('should return null when hget value is null', async () => {
      mockClient.hget.mockResolvedValue(null);
      await expect(client.hget('key', 'field')).resolves.toBeNull();
    });

    it('should return raw string when hget value is not JSON', async () => {
      mockClient.hget.mockResolvedValue('plain');
      await expect(client.hget('key', 'field')).resolves.toBe('plain');
    });

    it('should parse JSON hget values', async () => {
      mockClient.hget.mockResolvedValue('{"b":2}');
      await expect(client.hget('key', 'field')).resolves.toEqual({ b: 2 });
    });

    it('should return hgetall result', async () => {
      mockClient.hgetall.mockResolvedValue({ a: '1' });
      await expect(client.hgetall('key')).resolves.toEqual({ a: '1' });
    });

    it('should call hdel with fields', async () => {
      mockClient.hdel.mockResolvedValue(2);
      await expect(client.hdel('key', 'a', 'b')).resolves.toBe(2);
      expect(mockClient.hdel).toHaveBeenCalledWith('key', 'a', 'b');
    });
  });

  describe('expire / ttl', () => {
    it('should call expire and return its result', async () => {
      mockClient.expire.mockResolvedValue(1);
      await expect(client.expire('key', 60)).resolves.toBe(1);
      expect(mockClient.expire).toHaveBeenCalledWith('key', 60);
    });

    it('should call ttl and return its result', async () => {
      mockClient.ttl.mockResolvedValue(120);
      await expect(client.ttl('key')).resolves.toBe(120);
    });
  });
});
