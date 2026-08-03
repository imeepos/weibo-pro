import { describe, it, expect } from 'vitest';
import { createHMAC } from '../hmac';
import { hex } from '../hex';

const secret = 'key';
const message = 'The quick brown fox jumps over the lazy dog';

// RFC 4231 test case 1: HMAC-SHA-256 with key "key"
const hmacSha256Hex = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
const hmacSha256Base64 = '97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=';
const hmacSha256Base64Url = '97yD9DBThCSxMpjmqm-xQ-9NWaFJRhdZl0edvC0aPNg';

describe('createHMAC', () => {
  it('importKey + sign with hex encoding matches RFC 4231', async () => {
    const hmac = createHMAC('SHA-256', 'hex');
    const key = await hmac.importKey(secret, 'sign');
    expect(await hmac.sign(key, message)).toBe(hmacSha256Hex);
  });

  it('sign auto-imports a string key', async () => {
    const hmac = createHMAC('SHA-256', 'hex');
    expect(await hmac.sign(secret, message)).toBe(hmacSha256Hex);
  });

  it('none encoding returns ArrayBuffer', async () => {
    const hmac = createHMAC('SHA-256');
    const sig = await hmac.sign(secret, message);
    expect(sig).toBeInstanceOf(ArrayBuffer);
    expect(hex.encode(sig)).toBe(hmacSha256Hex);
  });

  it('base64 encoding returns standard base64', async () => {
    const hmac = createHMAC('SHA-256', 'base64');
    expect(await hmac.sign(secret, message)).toBe(hmacSha256Base64);
  });

  it('base64url encoding returns url-safe base64 with padding', async () => {
    const hmac = createHMAC('SHA-256', 'base64url');
    expect(await hmac.sign(secret, message)).toBe(hmacSha256Base64Url + '=');
  });

  it('base64urlnopad encoding returns url-safe base64 without padding', async () => {
    const hmac = createHMAC('SHA-256', 'base64urlnopad');
    expect(await hmac.sign(secret, message)).toBe(hmacSha256Base64Url);
  });

  it('verify returns true for a correct hex signature', async () => {
    const hmac = createHMAC('SHA-256', 'hex');
    expect(await hmac.verify(secret, message, hmacSha256Hex)).toBe(true);
  });

  it('verify returns false for tampered data', async () => {
    const hmac = createHMAC('SHA-256', 'hex');
    expect(await hmac.verify(secret, message + '!', hmacSha256Hex)).toBe(false);
  });

  it('verify returns false for a wrong signature', async () => {
    const hmac = createHMAC('SHA-256', 'hex');
    expect(await hmac.verify(secret, message, hmacSha256Hex.replace('f', '0'))).toBe(false);
  });

  it('verify accepts a base64 signature', async () => {
    const hmac = createHMAC('SHA-256', 'base64');
    expect(await hmac.verify(secret, message, hmacSha256Base64)).toBe(true);
  });

  it('verify round-trips base64url signed output', async () => {
    const hmac = createHMAC('SHA-256', 'base64url');
    const sig = await hmac.sign(secret, message);
    expect(await hmac.verify(secret, message, sig)).toBe(true);
  });

  it('verify round-trips base64urlnopad signed output', async () => {
    const hmac = createHMAC('SHA-256', 'base64urlnopad');
    const sig = await hmac.sign(secret, message);
    expect(await hmac.verify(secret, message, sig)).toBe(true);
  });

  it('verify round-trips none (ArrayBuffer) signed output', async () => {
    const hmac = createHMAC('SHA-256');
    const sig = await hmac.sign(secret, message);
    expect(await hmac.verify(secret, message, sig)).toBe(true);
  });

  it('supports SHA-1', async () => {
    const hmac = createHMAC('SHA-1', 'hex');
    const sig = await hmac.sign(secret, message);
    // known HMAC-SHA1 for key "key", msg "The quick brown fox..."
    expect(sig).toBe('de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9');
  });
});
