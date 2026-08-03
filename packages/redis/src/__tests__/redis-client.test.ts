import { describe, it, expect, vi, beforeEach } from 'vitest';

const { RedisMock } = vi.hoisted(() => ({ RedisMock: vi.fn() }));

vi.mock('ioredis', () => ({
  Redis: RedisMock,
  ChainableCommander: class {},
}));

import { RedisClient, RedisPipeline } from '../index';

const createMockClient = () => ({
  options: {},
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  setnx: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  quit: vi.fn().mockResolvedValue(undefined),
  zadd: vi.fn(),
  zincrby: vi.fn(),
  zscore: vi.fn(),
  zrangebyscore: vi.fn(),
  zremrangebyscore: vi.fn(),
  zrange: vi.fn(),
  zrevrange: vi.fn(),
  zcard: vi.fn(),
  zpopmax: vi.fn(),
  zrem: vi.fn(),
  hmset: vi.fn(),
  hset: vi.fn(),
  hget: vi.fn(),
  hgetall: vi.fn(),
  hdel: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  sadd: vi.fn(),
  sismember: vi.fn(),
  srem: vi.fn(),
  scard: vi.fn(),
  smembers: vi.fn(),
  lpush: vi.fn(),
  lrange: vi.fn(),
  ltrim: vi.fn(),
  keys: vi.fn(),
  pipeline: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  on: vi.fn(),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
});

const createMockPipeline = () => ({
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  zincrby: vi.fn(),
  zadd: vi.fn(),
  expire: vi.fn(),
  hmset: vi.fn(),
  hset: vi.fn(),
  exec: vi.fn(),
});

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
