import { describe, it, expect, vi, beforeEach } from 'vitest';

const { RedisMock } = vi.hoisted(() => ({ RedisMock: vi.fn() }));

vi.mock('ioredis', () => ({
  Redis: RedisMock,
  ChainableCommander: class {},
}));

import { RedisPipeline } from '../index';

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

describe('RedisPipeline', () => {
  let mockPipeline: ReturnType<typeof createMockPipeline>;
  let pipeline: RedisPipeline;

  beforeEach(() => {
    mockPipeline = createMockPipeline();
    pipeline = new RedisPipeline(mockPipeline as any);
  });

  describe('chaining', () => {
    it('should forward get and return this', () => {
      const result = pipeline.get('key');
      expect(mockPipeline.get).toHaveBeenCalledWith('key');
      expect(result).toBe(pipeline);
    });

    it('should forward set without ttl and return this', () => {
      const result = pipeline.set('key', 'value');
      expect(mockPipeline.set).toHaveBeenCalledWith('key', 'value');
      expect(mockPipeline.setex).not.toHaveBeenCalled();
      expect(result).toBe(pipeline);
    });

    it('should forward del and return this', () => {
      const result = pipeline.del('key');
      expect(mockPipeline.del).toHaveBeenCalledWith('key');
      expect(result).toBe(pipeline);
    });

    it('should forward zincrby and return this', () => {
      const result = pipeline.zincrby('key', 1, 'member');
      expect(mockPipeline.zincrby).toHaveBeenCalledWith('key', 1, 'member');
      expect(result).toBe(pipeline);
    });

    it('should forward zadd and return this', () => {
      const result = pipeline.zadd('key', 10, 'member');
      expect(mockPipeline.zadd).toHaveBeenCalledWith('key', 10, 'member');
      expect(result).toBe(pipeline);
    });

    it('should forward expire and return this', () => {
      const result = pipeline.expire('key', 60);
      expect(mockPipeline.expire).toHaveBeenCalledWith('key', 60);
      expect(result).toBe(pipeline);
    });

    it('should forward hmset and return this', () => {
      const data = { a: '1' };
      const result = pipeline.hmset('key', data);
      expect(mockPipeline.hmset).toHaveBeenCalledWith('key', data);
      expect(result).toBe(pipeline);
    });

    it('should forward hset with a string value and return this', () => {
      const result = pipeline.hset('key', 'field', 'value');
      expect(mockPipeline.hset).toHaveBeenCalledWith('key', 'field', 'value');
      expect(result).toBe(pipeline);
    });

    it('should chain multiple operations on the same instance', () => {
      const result = pipeline.get('k1').set('k2', 'v2').del('k3').zadd('k4', 1, 'm').expire('k5', 10);
      expect(mockPipeline.get).toHaveBeenCalledWith('k1');
      expect(mockPipeline.set).toHaveBeenCalledWith('k2', 'v2');
      expect(mockPipeline.del).toHaveBeenCalledWith('k3');
      expect(mockPipeline.zadd).toHaveBeenCalledWith('k4', 1, 'm');
      expect(mockPipeline.expire).toHaveBeenCalledWith('k5', 10);
      expect(result).toBe(pipeline);
    });
  });

  describe('set with ttl', () => {
    it('should use setex when ttl is provided', () => {
      const result = pipeline.set('key', 'value', 60);
      expect(mockPipeline.setex).toHaveBeenCalledWith('key', 60, 'value');
      expect(mockPipeline.set).not.toHaveBeenCalled();
      expect(result).toBe(pipeline);
    });

    it('should use plain set when ttl is 0', () => {
      pipeline.set('key', 'value', 0);
      expect(mockPipeline.set).toHaveBeenCalledWith('key', 'value');
      expect(mockPipeline.setex).not.toHaveBeenCalled();
    });
  });

  describe('hset serialization', () => {
    it('should JSON.stringify non-string values', () => {
      pipeline.hset('key', 'field', { a: 1 });
      expect(mockPipeline.hset).toHaveBeenCalledWith('key', 'field', '{"a":1}');
    });

    it('should keep string values unchanged', () => {
      pipeline.hset('key', 'field', 'plain');
      expect(mockPipeline.hset).toHaveBeenCalledWith('key', 'field', 'plain');
    });
  });

  describe('exec', () => {
    it('should forward to pipeline.exec and resolve its result', async () => {
      const reply: [Error | null, any][] = [[null, 'value']];
      mockPipeline.exec.mockResolvedValue(reply);

      await expect(pipeline.exec()).resolves.toEqual(reply);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should resolve null when pipeline.exec resolves null', async () => {
      mockPipeline.exec.mockResolvedValue(null);
      await expect(pipeline.exec()).resolves.toBeNull();
    });
  });
});
