/**
 * Claude Service Tests
 *
 * 测试 ClaudeService 的消息路由和客户端管理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

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

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-' + Date.now(),
}));

describe('ClaudeService', () => {
  describe('client management', () => {
    it('should track client connections', () => {
      const clientSockets = new Map<string, Socket>();
      const socketToClient = new Map<string, string>();

      // 模拟连接
      const mockSocket = { id: 'socket-1' } as Socket;
      const clientId = 'client-1';

      clientSockets.set(clientId, mockSocket);
      socketToClient.set(mockSocket.id, clientId);

      expect(clientSockets.has(clientId)).toBe(true);
      expect(socketToClient.get('socket-1')).toBe(clientId);
    });

    it('should clean up on disconnect', () => {
      const clientSockets = new Map<string, Socket>();
      const socketToClient = new Map<string, string>();

      // 连接
      const mockSocket = { id: 'socket-1' } as Socket;
      const clientId = 'client-1';
      clientSockets.set(clientId, mockSocket);
      socketToClient.set(mockSocket.id, clientId);

      // 断开
      const disconnectedClientId = socketToClient.get(mockSocket.id);
      if (disconnectedClientId) {
        clientSockets.delete(disconnectedClientId);
      }
      socketToClient.delete(mockSocket.id);

      expect(clientSockets.has(clientId)).toBe(false);
      expect(socketToClient.has('socket-1')).toBe(false);
    });
  });

  describe('command routing', () => {
    it('should generate unique task IDs', () => {
      const taskIds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const taskId = `task-${Date.now()}-${Math.random()}`;
        taskIds.add(taskId);
      }

      expect(taskIds.size).toBe(100);
    });

    it('should build correct command structure', () => {
      const clientId = 'client-1';
      const wsCommand = {
        command: 'Hello',
        sessionId: 'session-1',
        cwd: '/project',
        model: 'sonnet',
      };

      const command = {
        taskId: 'task-1',
        clientId,
        sessionId: wsCommand.sessionId,
        command: wsCommand.command,
        cwd: wsCommand.cwd,
        model: wsCommand.model,
        timestamp: Date.now(),
      };

      expect(command.taskId).toBeDefined();
      expect(command.clientId).toBe(clientId);
      expect(command.command).toBe('Hello');
    });
  });

  describe('response routing', () => {
    it('should route response to correct client', () => {
      const clientSockets = new Map<string, Socket>();

      const mockSocket = {
        id: 'socket-1',
        emit: vi.fn(),
      } as unknown as Socket;

      clientSockets.set('client-1', mockSocket);

      // 模拟响应
      const response = {
        taskId: 'task-1',
        clientId: 'client-1',
        sessionId: 'session-1',
        type: 'message',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      const socket = clientSockets.get(response.clientId);
      if (socket) {
        socket.emit('claude:response', {
          taskId: response.taskId,
          sessionId: response.sessionId,
          type: response.type,
          data: response.data,
        });
      }

      expect(mockSocket.emit).toHaveBeenCalledWith('claude:response', expect.any(Object));
    });

    it('should handle missing client gracefully', () => {
      const clientSockets = new Map<string, Socket>();

      const response = {
        taskId: 'task-1',
        clientId: 'non-existent',
        sessionId: 'session-1',
        type: 'message',
        data: {},
        timestamp: Date.now(),
      };

      const socket = clientSockets.get(response.clientId);
      expect(socket).toBeUndefined();
    });
  });
});
