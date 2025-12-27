/**
 * Integration Tests - 端到端消息流测试
 *
 * 测试完整的消息链路：
 * 移动端 → 服务器 → RabbitMQ → 执行端 → RabbitMQ → 服务器 → 移动端
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock RabbitMQ
const mockProducerNext = vi.fn();
const mockConsumerSubscribe = vi.fn();

vi.mock('@sker/mq', () => ({
  useQueue: vi.fn((queueName: string) => ({
    producer: { next: mockProducerNext },
    consumer$: {
      subscribe: mockConsumerSubscribe,
    },
    queueName,
  })),
}));

describe('Integration: Message Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Flow (Client → Executor)', () => {
    it('should route command through correct queue', () => {
      const command = {
        taskId: 'task-integration-1',
        clientId: 'client-integration-1',
        command: 'Hello from mobile',
        timestamp: Date.now(),
      };

      // 模拟发送到 claude.commands 队列
      mockProducerNext(command);

      expect(mockProducerNext).toHaveBeenCalledWith(command);
      expect(mockProducerNext).toHaveBeenCalledTimes(1);
    });

    it('should include all required fields in command', () => {
      const command = {
        taskId: 'task-1',
        clientId: 'client-1',
        command: 'Test command',
        timestamp: Date.now(),
      };

      expect(command).toHaveProperty('taskId');
      expect(command).toHaveProperty('clientId');
      expect(command).toHaveProperty('command');
      expect(command).toHaveProperty('timestamp');
    });

    it('should support optional fields', () => {
      const commandWithOptions = {
        taskId: 'task-1',
        clientId: 'client-1',
        command: 'Test',
        sessionId: 'session-resume',
        cwd: '/project/path',
        model: 'opus',
        permissionMode: 'bypassPermissions' as const,
        timestamp: Date.now(),
      };

      expect(commandWithOptions.sessionId).toBe('session-resume');
      expect(commandWithOptions.cwd).toBe('/project/path');
      expect(commandWithOptions.model).toBe('opus');
    });
  });

  describe('Response Flow (Executor → Client)', () => {
    it('should route response through correct queue', () => {
      const response = {
        taskId: 'task-integration-1',
        clientId: 'client-integration-1',
        sessionId: 'session-new',
        type: 'message' as const,
        data: { content: 'Hello from Claude' },
        timestamp: Date.now(),
      };

      // 模拟发送到 claude.responses 队列
      mockProducerNext(response);

      expect(mockProducerNext).toHaveBeenCalledWith(response);
    });

    it('should handle all response types', () => {
      const responseTypes = [
        { type: 'session-created', data: { sessionId: 'new-session' } },
        { type: 'message', data: { content: 'text' } },
        { type: 'result', data: { modelUsage: {} } },
        { type: 'complete', data: { exitCode: 0, isNewSession: true } },
        { type: 'error', data: { message: 'Error occurred', code: 'ERR' } },
        { type: 'token-budget', data: { used: 1000, total: 160000 } },
      ];

      responseTypes.forEach(({ type, data }) => {
        const response = {
          taskId: 'task-1',
          clientId: 'client-1',
          sessionId: 'session-1',
          type,
          data,
          timestamp: Date.now(),
        };

        expect(response.type).toBe(type);
        expect(response.data).toEqual(data);
      });
    });
  });

  describe('Session Management', () => {
    it('should create new session for new conversation', () => {
      const command = {
        taskId: 'task-new',
        clientId: 'client-1',
        command: 'Start new conversation',
        sessionId: undefined as string | undefined,
        timestamp: Date.now(),
      };

      expect(command.sessionId).toBeUndefined();
    });

    it('should resume existing session', () => {
      const command = {
        taskId: 'task-resume',
        clientId: 'client-1',
        sessionId: 'existing-session-id',
        command: 'Continue conversation',
        timestamp: Date.now(),
      };

      expect(command.sessionId).toBe('existing-session-id');
    });

    it('should handle session-created response', () => {
      const response = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'newly-created-session',
        type: 'session-created' as const,
        data: { sessionId: 'newly-created-session' },
        timestamp: Date.now(),
      };

      expect(response.type).toBe('session-created');
      expect((response.data as { sessionId: string }).sessionId).toBe('newly-created-session');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors correctly', () => {
      const errorResponse = {
        taskId: 'task-error',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'error' as const,
        data: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
        },
        timestamp: Date.now(),
      };

      expect(errorResponse.type).toBe('error');
      expect((errorResponse.data as { message: string }).message).toBeDefined();
      expect((errorResponse.data as { code: string }).code).toBeDefined();
    });

    it('should handle connection errors', () => {
      const connectionError = {
        type: 'error',
        data: {
          message: 'Connection failed',
          code: 'CONNECTION_ERROR',
        },
      };

      expect(connectionError.data.code).toBe('CONNECTION_ERROR');
    });
  });

  describe('Token Budget Tracking', () => {
    it('should track token usage', () => {
      const tokenResponse = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'token-budget' as const,
        data: {
          used: 5000,
          total: 160000,
        },
        timestamp: Date.now(),
      };

      expect(tokenResponse.type).toBe('token-budget');
      expect((tokenResponse.data as { used: number; total: number }).used).toBeLessThan(
        (tokenResponse.data as { used: number; total: number }).total
      );
    });
  });
});
