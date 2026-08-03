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

  describe('get', () => {
    it('should return null when value is null', async () => {
      mockClient.get.mockResolvedValue(null);
      await expect(client.get('key')).resolves.toBeNull();
    });

    it('should return the raw string when value is not valid JSON', async () => {
      mockClient.get.mockResolvedValue('plain-text');
      await expect(client.get('key')).resolves.toBe('plain-text');
    });

    it('should parse JSON strings into objects', async () => {
      mockClient.get.mockResolvedValue('{"a":1}');
      await expect(client.get('key')).resolves.toEqual({ a: 1 });
    });
  });

  describe('set', () => {
    it('should store a string value as-is via set', async () => {
      mockClient.set.mockResolvedValue('OK');
      await client.set('key', 'value');
      expect(mockClient.set).toHaveBeenCalledWith('key', 'value');
      expect(mockClient.setex).not.toHaveBeenCalled();
    });

    it('should JSON.stringify non-string values', async () => {
      mockClient.set.mockResolvedValue('OK');
      await client.set('key', { a: 1 });
      expect(mockClient.set).toHaveBeenCalledWith('key', '{"a":1}');
    });

    it('should use setex when a ttl is provided', async () => {
      mockClient.setex.mockResolvedValue('OK');
      await client.set('key', 'value', 60);
      expect(mockClient.setex).toHaveBeenCalledWith('key', 60, 'value');
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('should serialize non-string values before setex', async () => {
      mockClient.setex.mockResolvedValue('OK');
      await client.set('key', { a: 1 }, 60);
      expect(mockClient.setex).toHaveBeenCalledWith('key', 60, '{"a":1}');
    });
  });

  describe('setex / setnx', () => {
    it('should call setex with serialized value', async () => {
      mockClient.setex.mockResolvedValue('OK');
      await client.setex('key', 60, 'value');
      expect(mockClient.setex).toHaveBeenCalledWith('key', 60, 'value');
    });

    it('should serialize non-string values in setex', async () => {
      mockClient.setex.mockResolvedValue('OK');
      await client.setex('key', 60, [1, 2]);
      expect(mockClient.setex).toHaveBeenCalledWith('key', 60, '[1,2]');
    });

    it('should return the result of setnx', async () => {
      mockClient.setnx.mockResolvedValue(1);
      await expect(client.setnx('key', 'value')).resolves.toBe(1);
      expect(mockClient.setnx).toHaveBeenCalledWith('key', 'value');
    });
  });

  describe('del / exists / close', () => {
    it('should call del with the key', async () => {
      mockClient.del.mockResolvedValue(1);
      await client.del('key');
      expect(mockClient.del).toHaveBeenCalledWith('key');
    });

    it('should return true when exists returns 1', async () => {
      mockClient.exists.mockResolvedValue(1);
      await expect(client.exists('key')).resolves.toBe(true);
    });

    it('should return false when exists returns 0', async () => {
      mockClient.exists.mockResolvedValue(0);
      await expect(client.exists('key')).resolves.toBe(false);
    });

    it('should call quit on close', async () => {
      mockClient.quit.mockResolvedValue('OK');
      await client.close();
      expect(mockClient.quit).toHaveBeenCalled();
    });
  });
});
