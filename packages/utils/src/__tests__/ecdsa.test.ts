import { describe, it, expect } from 'vitest';
import { ecdsa } from '../ecdsa';

describe('ecdsa', () => {
  it('P-256 generateKeyPair returns exported ArrayBuffer keys', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-256');
    expect(privateKey).toBeInstanceOf(ArrayBuffer);
    expect(publicKey).toBeInstanceOf(ArrayBuffer);
  });

  it('import + sign/verify round-trips on P-256', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-256');
    const priv = await ecdsa.importPrivateKey(privateKey, 'P-256');
    const pub = await ecdsa.importPublicKey(publicKey, 'P-256');
    const signature = await ecdsa.sign(priv, 'message to sign');
    expect(await ecdsa.verify(pub, { signature, data: 'message to sign' })).toBe(true);
  });

  it('verify returns false for tampered data', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-256');
    const priv = await ecdsa.importPrivateKey(privateKey, 'P-256');
    const pub = await ecdsa.importPublicKey(publicKey, 'P-256');
    const signature = await ecdsa.sign(priv, 'original data');
    expect(await ecdsa.verify(pub, { signature, data: 'tampered data' })).toBe(false);
  });

  it('verify returns false for a tampered signature', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-256');
    const priv = await ecdsa.importPrivateKey(privateKey, 'P-256');
    const pub = await ecdsa.importPublicKey(publicKey, 'P-256');
    const signature = await ecdsa.sign(priv, 'data');
    const tampered = new Uint8Array(signature);
    tampered[0] = tampered[0]! ^ 0xff;
    expect(await ecdsa.verify(pub, { signature: tampered, data: 'data' })).toBe(false);
  });

  it('supports SHA-512 hash for sign/verify', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-256');
    const priv = await ecdsa.importPrivateKey(privateKey, 'P-256');
    const pub = await ecdsa.importPublicKey(publicKey, 'P-256');
    const signature = await ecdsa.sign(priv, 'hash test', 'SHA-512');
    expect(await ecdsa.verify(pub, { signature, data: 'hash test', hash: 'SHA-512' })).toBe(true);
  });

  it('P-384 generate + sign/verify round-trip', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-384');
    const priv = await ecdsa.importPrivateKey(privateKey, 'P-384');
    const pub = await ecdsa.importPublicKey(publicKey, 'P-384');
    const signature = await ecdsa.sign(priv, 'p384', 'SHA-384');
    expect(await ecdsa.verify(pub, { signature, data: 'p384', hash: 'SHA-384' })).toBe(true);
  });

  it('exportKey supports jwk format', async () => {
    const { privateKey, publicKey } = await ecdsa.generateKeyPair('P-256');
    const priv = await ecdsa.importPrivateKey(privateKey, 'P-256', true);
    const pub = await ecdsa.importPublicKey(publicKey, 'P-256', true);
    const privJwk = await ecdsa.exportKey(priv, 'jwk');
    const pubJwk = await ecdsa.exportKey(pub, 'jwk');
    expect(privJwk.kty).toBe('EC');
    expect(pubJwk.kty).toBe('EC');
    expect(pubJwk.crv).toBe('P-256');
  });
});
