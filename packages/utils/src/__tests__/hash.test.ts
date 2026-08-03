import { describe, it, expect } from 'vitest';
import { createHash } from '../hash';
import { hex } from '../hex';
import { base64, base64Url } from '../base64';

const input = 'hello';

const hexToBytes = (hexStr: string): Uint8Array =>
  new Uint8Array((hexStr.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)));

const vectors = {
  'SHA-1': {
    hex: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
  },
  'SHA-256': {
    hex: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    base64: 'LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=',
    base64url: 'LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ',
  },
  'SHA-384': {
    hex: '59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f',
  },
  'SHA-512': {
    hex: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
  },
} as const;

describe('createHash', () => {
  for (const algorithm of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const) {
    it(`${algorithm} hex digest of "hello"`, async () => {
      expect(await createHash(algorithm, 'hex').digest(input)).toBe(vectors[algorithm].hex);
    });
  }

  it('SHA-256 none encoding returns ArrayBuffer', async () => {
    const buf = await createHash('SHA-256').digest(input);
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(hex.encode(buf)).toBe(vectors['SHA-256'].hex);
  });

  it('SHA-256 base64 digest', async () => {
    expect(await createHash('SHA-256', 'base64').digest(input)).toBe(vectors['SHA-256'].base64);
  });

  it('SHA-256 base64url digest is padded', async () => {
    expect(await createHash('SHA-256', 'base64url').digest(input)).toBe(
      vectors['SHA-256'].base64url + '=',
    );
  });

  it('SHA-256 base64urlnopad digest has no padding', async () => {
    expect(await createHash('SHA-256', 'base64urlnopad').digest(input)).toBe(
      vectors['SHA-256'].base64url,
    );
  });

  it('base64 output matches standard base64 of the raw digest bytes', async () => {
    const hexDigest = await createHash('SHA-256', 'hex').digest(input);
    expect(await createHash('SHA-256', 'base64').digest(input)).toBe(
      base64.encode(hexToBytes(hexDigest)),
    );
  });

  it('base64url output matches base64Url encoder', async () => {
    const hexDigest = await createHash('SHA-256', 'hex').digest(input);
    expect(await createHash('SHA-256', 'base64urlnopad').digest(input)).toBe(
      base64Url.encode(hexToBytes(hexDigest), { padding: false }),
    );
  });

  it('accepts ArrayBuffer and TypedArray input', async () => {
    const bytes = new TextEncoder().encode('hello');
    expect(await createHash('SHA-256', 'hex').digest(bytes)).toBe(vectors['SHA-256'].hex);
    expect(await createHash('SHA-256', 'hex').digest(bytes.buffer)).toBe(vectors['SHA-256'].hex);
  });

  it('digests empty input', async () => {
    expect(await createHash('SHA-256', 'hex').digest('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
