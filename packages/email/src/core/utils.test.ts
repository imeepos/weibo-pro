import { describe, it, expect, vi, afterEach } from 'vitest';
import { sleep, generateRandomString } from './utils';

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the given number of milliseconds', async () => {
    vi.useFakeTimers();

    let resolved = false;
    const pending = sleep(1000).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    await pending;
    expect(resolved).toBe(true);
  });

  it('resolves when called with 0ms', async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});

describe('generateRandomString', () => {
  it('returns a string of the requested length', () => {
    for (const length of [0, 1, 5, 16, 32, 100]) {
      expect(generateRandomString(length)).toHaveLength(length);
    }
  });

  it('only contains lowercase letters and digits', () => {
    const value = generateRandomString(100);
    expect(value).toMatch(/^[a-z0-9]{100}$/);
  });

  it('generates distinct values across calls', () => {
    const values = new Set(
      Array.from({ length: 100 }, () => generateRandomString(10))
    );
    expect(values.size).toBe(100);
  });
});
