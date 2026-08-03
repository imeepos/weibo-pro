import { describe, it, expect } from 'vitest';
import { hex } from '../hex';

describe('hex', () => {
  it('encodes empty input to empty string', () => {
    expect(hex.encode('')).toBe('');
    expect(hex.encode(new Uint8Array(0))).toBe('');
  });

  it('encodes "hello" to "68656c6c6f"', () => {
    expect(hex.encode('hello')).toBe('68656c6c6f');
  });

  it('encodes bytes to lowercase hex', () => {
    expect(hex.encode(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef');
    expect(hex.encode(new Uint8Array([0x00, 0x01, 0x0f, 0x10]))).toBe('00010f10');
  });

  it('accepts ArrayBuffer input', () => {
    const buf = new Uint8Array([0xab, 0xcd]).buffer;
    expect(hex.encode(buf)).toBe('abcd');
  });

  it('decodes hex string back to text', () => {
    expect(hex.decode('68656c6c6f')).toBe('hello');
    // decode returns the UTF-8 interpretation of the raw bytes
    expect(hex.decode('deadbeef')).toBe(new TextDecoder().decode(new Uint8Array([0xde, 0xad, 0xbe, 0xef])));
  });

  it('decodes empty string without throwing', () => {
    expect(hex.decode('')).toBe('');
  });

  it('throws on odd-length hex string', () => {
    expect(() => hex.decode('686')).toThrow('Invalid hexadecimal string');
  });

  it('throws on invalid hex characters', () => {
    expect(() => hex.decode('zz')).toThrow('Invalid hexadecimal string');
    expect(() => hex.decode('6g')).toThrow('Invalid hexadecimal string');
    expect(() => hex.decode('68656c6c6g')).toThrow('Invalid hexadecimal string');
  });

  it('round-trips text', () => {
    expect(hex.decode(hex.encode('round-trip 123'))).toBe('round-trip 123');
  });

  it('decode mirrors TextDecoder for the encoded bytes', () => {
    const bytes = new Uint8Array([0x00, 0x10, 0x7f, 0x80, 0xff]);
    expect(hex.decode(hex.encode(bytes))).toBe(new TextDecoder().decode(bytes));
  });
});
