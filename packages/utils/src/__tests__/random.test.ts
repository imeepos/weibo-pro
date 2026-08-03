import { describe, it, expect } from 'vitest';
import { generateRandomString, createRandomStringGenerator } from '../random';

const fullAlphabet = /^[a-zA-Z0-9\-_]+$/;

describe('generateRandomString', () => {
  it('returns a string of the requested length', () => {
    expect(generateRandomString(10)).toHaveLength(10);
    expect(generateRandomString(32)).toHaveLength(32);
    expect(generateRandomString(1)).toHaveLength(1);
  });

  it('only uses characters from the full alphabet', () => {
    for (let i = 0; i < 50; i++) {
      expect(fullAlphabet.test(generateRandomString(24))).toBe(true);
    }
  });

  it('produces varied output', () => {
    const a = generateRandomString(32);
    const b = generateRandomString(32);
    expect(a).not.toBe(b);
  });
});

describe('createRandomStringGenerator', () => {
  it('restricts output to the configured alphabets', () => {
    const gen = createRandomStringGenerator('a-z', '0-9');
    const re = /^[a-z0-9]+$/;
    for (let i = 0; i < 50; i++) {
      const s = gen(16);
      expect(s).toHaveLength(16);
      expect(re.test(s)).toBe(true);
    }
  });

  it('generates only lowercase for a single "a-z" alphabet', () => {
    const gen = createRandomStringGenerator('a-z');
    for (let i = 0; i < 20; i++) {
      expect(/^[a-z]+$/.test(gen(8))).toBe(true);
    }
  });

  it('allows per-call alphabet override', () => {
    const gen = createRandomStringGenerator('a-z', 'A-Z', '0-9');
    for (let i = 0; i < 20; i++) {
      expect(/^[0-9]+$/.test(gen(6, '0-9'))).toBe(true);
    }
    expect(/^[-_]+$/.test(gen(6, '-_'))).toBe(true);
  });

  it('throws on non-positive length', () => {
    const gen = createRandomStringGenerator('a-z');
    expect(() => gen(0)).toThrow('Length must be a positive integer');
    expect(() => gen(-1)).toThrow('Length must be a positive integer');
  });

  it('throws when no alphabet is provided', () => {
    expect(() => createRandomStringGenerator()).toThrow('No valid characters provided');
  });

  it('generates unique strings in bulk', () => {
    const gen = createRandomStringGenerator('0-9');
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(gen(8));
    }
    expect(seen.size).toBeGreaterThan(90);
  });
});
