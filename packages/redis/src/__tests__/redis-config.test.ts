import { describe, it, expect, vi, afterEach } from 'vitest';

const { RedisMock } = vi.hoisted(() => ({ RedisMock: vi.fn() }));

vi.mock('ioredis', () => ({
  Redis: RedisMock,
  ChainableCommander: class {},
}));

import { redisConfigFactory } from '../index';

describe('redisConfigFactory', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return REDIS_URL when it is set', () => {
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
    expect(redisConfigFactory()).toBe('redis://localhost:6379');
  });

  it('should throw when REDIS_URL is missing', () => {
    vi.stubEnv('REDIS_URL', '');
    expect(() => redisConfigFactory()).toThrow(/REDIS_URL NOT FOUND/);
  });

  it('should throw when REDIS_URL is undefined', () => {
    vi.stubEnv('REDIS_URL', undefined);
    expect(() => redisConfigFactory()).toThrow(/REDIS_URL NOT FOUND/);
  });
});
