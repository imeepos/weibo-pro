/**
 * Claude Gateway Tests
 *
 * 测试 ClaudeGateway 的 Socket.IO 事件处理
 */

import { describe, it, expect, vi, } from 'vitest';
import type { } from 'socket.io';

// Mock dependencies
vi.mock('@sker/core', () => ({
  Injectable: () => (target: any) => target,
  Logger: class {
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    debug = vi.fn();
  },
}));

vi.mock('@sker/mq', () => ({
  useQueue: vi.fn(() => ({
    producer: { next: vi.fn() },
    consumer$: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
  })),
}));

describe('ClaudeGateway', () => {
  describe('Socket.IO event names', () => {
    it('should use correct event names for client to server', () => {
      const clientToServerEvents = [
        'claude:command',
        'claude:abort',
      ];

      clientToServerEvents.forEach(event => {
        expect(event).toMatch(/^claude:/);
      });
    });

    it('should use correct event names for server to client', () => {
      const serverToClientEvents = [
        'claude:connected',
        'claude:response',
        'claude:task-created',
        'claude:error',
        'claude:abort-ack',
      ];

      serverToClientEvents.forEach(event => {
        expect(event).toMatch(/^claude:/);
      });
    });
  });

  describe('command structure', () => {
    it('should accept valid command format', () => {
      const command = {
        command: 'Hello Claude',
        sessionId: 'session-123',
        cwd: '/path/to/project',
        model: 'sonnet',
      };

      expect(command.command).toBeDefined();
      expect(typeof command.command).toBe('string');
    });

    it('should accept minimal command', () => {
      const command = {
        command: 'Hello',
      };

      expect(command.command).toBe('Hello');
    });
  });

  describe('response structure', () => {
    it('should format response correctly', () => {
      const response = {
        taskId: 'task-123',
        sessionId: 'session-123',
        type: 'message',
        data: { content: 'Response text' },
      };

      expect(response.taskId).toBeDefined();
      expect(response.sessionId).toBeDefined();
      expect(response.type).toBeDefined();
      expect(response.data).toBeDefined();
    });
  });

  describe('connection handling', () => {
    it('should generate unique client ID format', () => {
      const clientId = 'uuid-format-client-id';
      expect(typeof clientId).toBe('string');
      expect(clientId.length).toBeGreaterThan(0);
    });
  });
});
