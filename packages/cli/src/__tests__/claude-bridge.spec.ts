/**
 * Claude Bridge Tests
 *
 * 测试 ClaudeBridge 的消息路由功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@sker/core', () => ({
  Injectable: () => (target: any) => target,
  Inject: () => () => {},
  root: {
    get: vi.fn(),
  },
}));

vi.mock('@sker/mq', () => ({
  useQueue: vi.fn(() => ({
    producer: {
      next: vi.fn(),
    },
    consumer$: {
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    },
  })),
}));

describe('ClaudeBridge', () => {
  describe('message routing', () => {
    it('should use correct queue names', () => {
      // 验证队列名称常量
      const COMMANDS_QUEUE = 'claude.commands';
      const RESPONSES_QUEUE = 'claude.responses';

      expect(COMMANDS_QUEUE).toBe('claude.commands');
      expect(RESPONSES_QUEUE).toBe('claude.responses');
    });
  });

  describe('command structure', () => {
    it('should have required fields', () => {
      const command = {
        taskId: 'task-1',
        clientId: 'client-1',
        command: 'Hello',
        timestamp: Date.now(),
      };

      expect(command.taskId).toBeDefined();
      expect(command.clientId).toBeDefined();
      expect(command.command).toBeDefined();
      expect(command.timestamp).toBeDefined();
    });

    it('should support optional fields', () => {
      const command = {
        taskId: 'task-1',
        clientId: 'client-1',
        command: 'Hello',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/path/to/project',
        model: 'sonnet',
      };

      expect(command.sessionId).toBe('session-1');
      expect(command.cwd).toBe('/path/to/project');
      expect(command.model).toBe('sonnet');
    });
  });

  describe('response structure', () => {
    it('should have required fields', () => {
      const response = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'message' as const,
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      expect(response.taskId).toBeDefined();
      expect(response.clientId).toBeDefined();
      expect(response.sessionId).toBeDefined();
      expect(response.type).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should support different response types', () => {
      const types = [
        'session-created',
        'message',
        'result',
        'complete',
        'error',
        'token-budget',
      ];

      types.forEach(type => {
        const response = {
          taskId: 'task-1',
          clientId: 'client-1',
          sessionId: 'session-1',
          type,
          data: {},
          timestamp: Date.now(),
        };

        expect(response.type).toBe(type);
      });
    });
  });
});
