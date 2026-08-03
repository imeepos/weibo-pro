import { describe, it, expect } from 'vitest';
import { rsa } from '../rsa';

describe('rsa', () => {
  it('generateKeyPair + encrypt/decrypt round-trip (RSA-OAEP)', async () => {
    const { privateKey, publicKey } = await rsa.generateKeyPair(2048);
    const ciphertext = await rsa.encrypt(publicKey, 'secret message');
    const plaintext = await rsa.decrypt(privateKey, ciphertext);
    expect(new TextDecoder().decode(plaintext)).toBe('secret message');
  });

  it('exportKey + importKey round-trip still decrypts', async () => {
    const { privateKey, publicKey } = await rsa.generateKeyPair(2048);
    const privJwk = await rsa.exportKey(privateKey, 'jwk');
    const pubJwk = await rsa.exportKey(publicKey, 'jwk');
    expect(privJwk.kty).toBe('RSA');

    const priv2 = await rsa.importKey(privJwk, 'decrypt');
    const pub2 = await rsa.importKey(pubJwk, 'encrypt');
    const ciphertext = await rsa.encrypt(pub2, 'round trip via jwk');
    const plaintext = await rsa.decrypt(priv2, ciphertext);
    expect(new TextDecoder().decode(plaintext)).toBe('round trip via jwk');
  });

  it('encrypt accepts ArrayBuffer input', async () => {
    const { privateKey, publicKey } = await rsa.generateKeyPair(2048);
    const bytes = new TextEncoder().encode('bytes input');
    const ciphertext = await rsa.encrypt(publicKey, bytes);
    const plaintext = await rsa.decrypt(privateKey, ciphertext);
    expect(new TextDecoder().decode(plaintext)).toBe('bytes input');
  });

  it('sign/verify round-trip with RSA-PSS', async () => {
    const { privateKey, publicKey } = await crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );

    const signature = await rsa.sign(privateKey, 'hello');
    expect(await rsa.verify(publicKey, { signature, data: 'hello' })).toBe(true);
  });

  it('RSA-PSS verify returns false for tampered data', async () => {
    const { privateKey, publicKey } = await crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );

    const signature = await rsa.sign(privateKey, 'original');
    expect(await rsa.verify(publicKey, { signature, data: 'tampered' })).toBe(false);
  });
});
