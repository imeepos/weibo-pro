import { describe, it, expect } from 'vitest';
import { base32, base32hex } from '../base32';

const decoder = new TextDecoder();

describe('base32', () => {
  it('encodes empty string to empty string', () => {
    expect(base32.encode('')).toBe('');
  });

  it('encodes RFC 4648 standard vectors with padding', () => {
    expect(base32.encode('f')).toBe('MY======');
    expect(base32.encode('fo')).toBe('MZXQ====');
    expect(base32.encode('foo')).toBe('MZXW6===');
    expect(base32.encode('foob')).toBe('MZXW6YQ=');
    expect(base32.encode('fooba')).toBe('MZXW6YTB');
    expect(base32.encode('foobar')).toBe('MZXW6YTBOI======');
  });

  it('supports padding:false', () => {
    expect(base32.encode('foo', { padding: false })).toBe('MZXW6');
    expect(base32.encode('foobar', { padding: false })).toBe('MZXW6YTBOI');
  });

  it('decodes RFC 4648 standard vectors', () => {
    expect(decoder.decode(base32.decode('MY======'))).toBe('f');
    expect(decoder.decode(base32.decode('MZXQ===='))).toBe('fo');
    expect(decoder.decode(base32.decode('MZXW6==='))).toBe('foo');
    expect(decoder.decode(base32.decode('MZXW6YQ='))).toBe('foob');
    expect(decoder.decode(base32.decode('MZXW6YTB'))).toBe('fooba');
    expect(decoder.decode(base32.decode('MZXW6YTBOI======'))).toBe('foobar');
  });

  it('decodes unpadded strings', () => {
    expect(decoder.decode(base32.decode('MZXW6'))).toBe('foo');
  });

  it('round-trips arbitrary binary data', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff, 0x42]);
    expect(base32.decode(base32.encode(bytes))).toEqual(bytes);
  });

  it('accepts ArrayBuffer and TypedArray input for encode', () => {
    const bytes = new TextEncoder().encode('abc');
    expect(base32.encode(bytes)).toBe('MFRGG===');
    expect(base32.encode(bytes.buffer)).toBe('MFRGG===');
  });

  it('throws on invalid characters', () => {
    // '0' is not part of the RFC 4648 base32 alphabet
    expect(() => base32.decode('MZXW60')).toThrow('Invalid Base32 character: 0');
    expect(() => base32.decode('mzxw6===')).toThrow('Invalid Base32 character: m');
  });
});

describe('base32hex', () => {
  it('encodes RFC 4648 base32hex vectors', () => {
    expect(base32hex.encode('f')).toBe('CO======');
    expect(base32hex.encode('fo')).toBe('CPNG====');
    expect(base32hex.encode('foo')).toBe('CPNMU===');
    expect(base32hex.encode('foob')).toBe('CPNMUOG=');
    expect(base32hex.encode('fooba')).toBe('CPNMUOJ1');
    expect(base32hex.encode('foobar')).toBe('CPNMUOJ1E8======');
  });

  it('supports padding:false', () => {
    expect(base32hex.encode('foo', { padding: false })).toBe('CPNMU');
  });

  it('decodes base32hex vectors', () => {
    expect(decoder.decode(base32hex.decode('CPNMU==='))).toBe('foo');
    expect(decoder.decode(base32hex.decode('CPNMUOJ1E8======'))).toBe('foobar');
  });

  it('round-trips binary data', () => {
    const bytes = new Uint8Array([0x00, 0xaa, 0xbb, 0xcc, 0xff]);
    expect(base32hex.decode(base32hex.encode(bytes))).toEqual(bytes);
  });
});
