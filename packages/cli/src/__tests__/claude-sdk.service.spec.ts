/**
 * Claude SDK Service Tests
 *
 * 测试 ClaudeSdkService 的协议和消息结构
 */

import { describe, it, expect } from 'vitest';
import type { ClaudeCommand, ClaudeResponse, ClaudeResponseType } from '../types/index.js';

describe('ClaudeSdkService Protocol', () => {
  describe('ClaudeCommand structure', () => {
    it('should have required fields', () => {
      const command: ClaudeCommand = {
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
      const command: ClaudeCommand = {
        taskId: 'task-1',
        clientId: 'client-1',
        command: 'Hello',
        sessionId: 'session-1',
        cwd: '/project',
        model: 'sonnet',
        permissionMode: 'bypassPermissions',
        timestamp: Date.now(),
      };

      expect(command.sessionId).toBe('session-1');
      expect(command.cwd).toBe('/project');
      expect(command.model).toBe('sonnet');
      expect(command.permissionMode).toBe('bypassPermissions');
    });
  });

  describe('ClaudeResponse structure', () => {
    it('should have required fields', () => {
      const response: ClaudeResponse = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'message',
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

    it('should support all response types', () => {
      const types: ClaudeResponseType[] = [
        'session-created',
        'message',
        'result',
        'complete',
        'error',
        'token-budget',
      ];

      types.forEach(type => {
        const response: ClaudeResponse = {
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

  describe('Session-created response', () => {
    it('should include sessionId in data', () => {
      const response: ClaudeResponse = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'new-session-id',
        type: 'session-created',
        data: { sessionId: 'new-session-id' },
        timestamp: Date.now(),
      };

      expect((response.data as { sessionId: string }).sessionId).toBe('new-session-id');
    });
  });

  describe('Complete response', () => {
    it('should include exit info', () => {
      const response: ClaudeResponse = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'complete',
        data: { exitCode: 0, isNewSession: true },
        timestamp: Date.now(),
      };

      const data = response.data as { exitCode: number; isNewSession: boolean };
      expect(data.exitCode).toBe(0);
      expect(data.isNewSession).toBe(true);
    });
  });

  describe('Error response', () => {
    it('should include error details', () => {
      const response: ClaudeResponse = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'error',
        data: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
        },
        timestamp: Date.now(),
      };

      const data = response.data as { message: string; code: string };
      expect(data.message).toBe('Something went wrong');
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Token budget response', () => {
    it('should include usage info', () => {
      const response: ClaudeResponse = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'token-budget',
        data: { used: 5000, total: 160000 },
        timestamp: Date.now(),
      };

      const data = response.data as { used: number; total: number };
      expect(data.used).toBe(5000);
      expect(data.total).toBe(160000);
      expect(data.used).toBeLessThan(data.total);
    });
  });
});
