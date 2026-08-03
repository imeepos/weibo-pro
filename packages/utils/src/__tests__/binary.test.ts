import { describe, it, expect } from 'vitest';
import { binary } from '../binary';

describe('binary', () => {
  it('encodes utf-8 to Uint8Array', () => {
    const bytes = binary.encode('héllo');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toEqual(new TextEncoder().encode('héllo'));
  });

  it('decodes utf-8 by default', () => {
    const bytes = binary.encode('héllo wörld');
    expect(binary.decode(bytes)).toBe('héllo wörld');
  });

  it('decodes utf-16 (little endian)', () => {
    // UTF-16LE byte sequence for "héllo"
    const bytes = new Uint8Array([
      0x68, 0x00, // h
      0xe9, 0x00, // é
      0x6c, 0x00, // l
      0x6c, 0x00, // l
      0x6f, 0x00, // o
    ]);
    expect(binary.decode(bytes, 'utf-16')).toBe('héllo');
  });

  it('decodes iso-8859-1', () => {
    // ISO-8859-1 bytes for "café"
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    expect(binary.decode(bytes, 'iso-8859-1')).toBe('café');
  });

  it('accepts ArrayBuffer input', () => {
    const buf = binary.encode('hello').buffer;
    expect(binary.decode(buf)).toBe('hello');
  });

  it('round-trips through utf-8', () => {
    const input = 'The quick brown fox 汉字 🦊';
    expect(binary.decode(binary.encode(input))).toBe(input);
  });
});
