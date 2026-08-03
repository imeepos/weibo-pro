import { vi } from 'vitest';
import { ConnectionState } from '../types.js';
import type { ConnectionPool } from '../connection-pool.js';

export interface MockConsumeMessage {
  content: Buffer;
  properties: {
    messageId?: string;
    correlationId?: string;
    timestamp?: number;
    headers?: Record<string, unknown>;
  };
}

export let consumeCallback: ((msg: MockConsumeMessage | null) => void) | null = null;

export function createMockChannel() {
  consumeCallback = null;
  return {
    assertQueue: vi.fn().mockResolvedValue({}),
    prefetch: vi.fn().mockResolvedValue(undefined),
    consume: vi
      .fn()
      .mockImplementation(
        (_queue: string, cb: (msg: MockConsumeMessage | null) => void) => {
          consumeCallback = cb;
          return Promise.resolve({ consumerTag: 'tag-1' });
        },
      ),
    cancel: vi.fn().mockResolvedValue(undefined),
    ack: vi.fn(),
    nack: vi.fn(),
  };
}

export function createMockPool(channel = createMockChannel()) {
  return {
    isConnected: vi.fn().mockReturnValue(true),
    getChannel: vi.fn().mockReturnValue(channel),
    getState: vi.fn().mockReturnValue(ConnectionState.CONNECTED),
  } as unknown as ConnectionPool;
}

export function triggerMessage(msg: MockConsumeMessage) {
  if (!consumeCallback) {
    throw new Error('consume callback not registered');
  }
  consumeCallback(msg);
}

export function createMessage(body: unknown, props: MockConsumeMessage['properties'] = {}) {
  return {
    content: Buffer.from(JSON.stringify(body)),
    properties: props,
  };
}
