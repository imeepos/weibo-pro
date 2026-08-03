import { describe, it, expect } from 'vitest';
import { base64, base64Url } from '../base64';

const decoder = new TextDecoder();

describe('base64', () => {
  it('encodes empty string to empty string', () => {
    expect(base64.encode('')).toBe('');
  });

  it('encodes "hello" to "aGVsbG8="', () => {
    expect(base64.encode('hello')).toBe('aGVsbG8=');
  });

  it('supports padding:false', () => {
    expect(base64.encode('hello', { padding: false })).toBe('aGVsbG8');
  });

  it('decodes "aGVsbG8=" back to "hello"', () => {
    expect(decoder.decode(base64.decode('aGVsbG8='))).toBe('hello');
  });

  it('decodes unpadded strings', () => {
    expect(decoder.decode(base64.decode('aGVsbG8'))).toBe('hello');
  });

  it('uses standard +/ alphabet', () => {
    const bytes = new Uint8Array([0xfb, 0xff]);
    expect(base64.encode(bytes)).toBe('+/8=');
  });

  it('auto-detects url-safe alphabet on decode', () => {
    const bytes = new Uint8Array([0xfb, 0xff]);
    // base64Url of [0xfb, 0xff] is "-_8="
    expect(base64.decode('-_8=')).toEqual(bytes);
  });

  it('round-trips arbitrary binary data', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0xfe, 0xff, 0x80, 0x42, 0x2d, 0x5f]);
    expect(base64.decode(base64.encode(bytes))).toEqual(bytes);
  });

  it('accepts ArrayBuffer and TypedArray input', () => {
    const bytes = new TextEncoder().encode('hi');
    expect(base64.encode(bytes)).toBe('aGk=');
    expect(base64.encode(bytes.buffer)).toBe('aGk=');
  });

  it('throws on invalid characters', () => {
    expect(() => base64.decode('aGVsbG8%')).toThrow('Invalid Base64 character: %');
  });
});

describe('base64Url', () => {
  it('encodes with url-safe alphabet', () => {
    const bytes = new Uint8Array([0xfb, 0xff]);
    expect(base64Url.encode(bytes)).toBe('-_8=');
    expect(base64Url.encode(bytes, { padding: false })).toBe('-_8');
  });

  it('encodes "hello" with padding', () => {
    expect(base64Url.encode('hello')).toBe('aGVsbG8=');
  });

  it('decodes url-safe strings', () => {
    expect(base64Url.decode('-_8=')).toEqual(new Uint8Array([0xfb, 0xff]));
  });

  it('decodes standard alphabet too', () => {
    expect(decoder.decode(base64Url.decode('aGVsbG8='))).toBe('hello');
  });

  it('round-trips binary data', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x2d, 0x5f, 0x40]);
    expect(base64Url.decode(base64Url.encode(bytes))).toEqual(bytes);
  });
});
