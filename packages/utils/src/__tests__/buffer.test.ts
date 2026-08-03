import { describe, it, expect } from 'vitest';
import { toUint8Array, toArrayBuffer } from '../buffer';

describe('toUint8Array', () => {
  it('converts a string to utf-8 bytes', () => {
    const arr = toUint8Array('hello');
    expect(arr).toBeInstanceOf(Uint8Array);
    expect(Array.from(arr)).toEqual([104, 101, 108, 108, 111]);
  });

  it('wraps an ArrayBuffer without copying', () => {
    const buf = new ArrayBuffer(4);
    const arr = toUint8Array(buf);
    expect(arr.buffer).toBe(buf);
    expect(arr.byteLength).toBe(4);
  });

  it('copies the contents of a TypedArray', () => {
    const u8 = new Uint8Array([1, 2, 3, 4]);
    const arr = toUint8Array(u8);
    expect(Array.from(arr)).toEqual([1, 2, 3, 4]);
  });

  it('respects a TypedArray view offset and length', () => {
    const u8 = new Uint8Array([10, 20, 30, 40, 50, 60]);
    const view = new Uint8Array(u8.buffer, 2, 3); // [30, 40, 50]
    const arr = toUint8Array(view);
    expect(Array.from(arr)).toEqual([30, 40, 50]);
  });

  it('handles a DataView (ArrayBufferView)', () => {
    const buf = new ArrayBuffer(4);
    const dv = new DataView(buf);
    dv.setUint32(0, 0x01020304);
    const arr = toUint8Array(dv);
    expect(Array.from(arr)).toEqual([1, 2, 3, 4]);
  });

  it('copies SharedArrayBuffer-backed views into a fresh ArrayBuffer', () => {
    const sab = new SharedArrayBuffer(4);
    const u8 = new Uint8Array(sab);
    u8.set([5, 6, 7, 8]);
    const arr = toUint8Array(u8);
    expect(arr.buffer).not.toBe(sab);
    expect(arr.buffer).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(arr)).toEqual([5, 6, 7, 8]);
  });

  it('handles a Uint16Array view', () => {
    const u16 = new Uint16Array([0x0102, 0x0304]);
    const arr = toUint8Array(u16);
    expect(Array.from(arr)).toEqual([2, 1, 4, 3]); // little-endian layout
  });
});

describe('toArrayBuffer', () => {
  it('converts a string to an ArrayBuffer of utf-8 bytes', () => {
    const buf = toArrayBuffer('hello');
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(buf))).toEqual([104, 101, 108, 108, 111]);
  });

  it('returns an ArrayBuffer unchanged', () => {
    const buf = new ArrayBuffer(8);
    expect(toArrayBuffer(buf)).toBe(buf);
  });

  it('slices a TypedArray respecting offset and length', () => {
    const u8 = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const view = new Uint8Array(u8.buffer, 1, 4); // [2, 3, 4, 5]
    const buf = toArrayBuffer(view);
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(buf))).toEqual([2, 3, 4, 5]);
  });

  it('round-trips a string', () => {
    expect(new TextDecoder().decode(toArrayBuffer('round trip'))).toBe('round trip');
  });
});
