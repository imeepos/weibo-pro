import type { TypedArray } from './type'

export function isArrayBuffer(buffer: ArrayBufferLike): buffer is ArrayBuffer {
  return buffer instanceof ArrayBuffer
}

export function ensureArrayBuffer(data: ArrayBuffer | ArrayBufferLike): ArrayBuffer {
  if (isArrayBuffer(data)) {
    return data
  }
  return new Uint8Array(data as SharedArrayBuffer).slice().buffer
}

export function toUint8Array(
  data: string | ArrayBuffer | TypedArray | ArrayBufferView,
): Uint8Array<ArrayBuffer> {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data) as Uint8Array<ArrayBuffer>
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data) as Uint8Array<ArrayBuffer>
  }
  if (isArrayBuffer(data.buffer)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as Uint8Array<ArrayBuffer>
  }
  const bytes = new Uint8Array(data.byteLength) as Uint8Array<ArrayBuffer>
  const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  bytes.set(view)
  return bytes
}

export function toArrayBuffer(
  data: string | ArrayBuffer | TypedArray,
): ArrayBuffer {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data).buffer
  }
  if (data instanceof ArrayBuffer) {
    return data
  }
  if (isArrayBuffer(data.buffer)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  const bytes = new Uint8Array(data.byteLength)
  const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  bytes.set(view)
  return bytes.buffer
}
