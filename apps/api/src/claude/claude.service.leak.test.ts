import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeService } from './claude.service';
import type { ClaudeCommand, ClaudeResponse } from './types';

/** mock WorkerGateway：捕获 sendCommand 的回调与命令，无需真实 io */
function createMockWorkerGateway() {
  let capturedCommand: ClaudeCommand | undefined;
  let capturedOnResponse: ((response: ClaudeResponse) => void) | undefined;
  const gateway = {
    initialize: vi.fn(),
    shutdown: vi.fn(),
    isWorkerConnected: vi.fn().mockReturnValue(true),
    sendCommand: vi.fn((command: ClaudeCommand, onResponse: (r: ClaudeResponse) => void) => {
      capturedCommand = command;
      capturedOnResponse = onResponse;
      return true;
    }),
    sendApproval: vi.fn().mockReturnValue(true),
    getOnlineWorkers: vi.fn().mockReturnValue([]),
  };
  return { gateway, getCommand: () => capturedCommand, getOnResponse: () => capturedOnResponse };
}

function makeSocket(id: string) {
  return { id, emit: vi.fn() } as never;
}

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * 1. claude.service.ts:285 taskToWorker 仅在 handleResponse 的 complete/error 分支删除，
 *    但当客户端已断开时 handleResponse 在 :266 早退，跳过删除 → 条目永久滞留。
 * 2. claude.service.ts:260 requestToTask 仅 sendApprovalResponse 删除，批准永不回应则泄漏。
 * 3. 客户端断开时未清理其 activeTasks 相关的 taskToWorker/requestToTask。
 */
describe('ClaudeService 映射清理泄漏修复', () => {
  let mock: ReturnType<typeof createMockWorkerGateway>;
  let service: ClaudeService;

  beforeEach(() => {
    mock = createMockWorkerGateway();
    service = new ClaudeService(mock.gateway as never);
    vi.clearAllMocks();
  });

  it('客户端断开后到达的 complete 响应仍清理 taskToWorker 映射', async () => {
    const socket = makeSocket('s1');
    const clientId = service.registerClient(socket);
    const taskId = await service.sendCommand(clientId, { command: 'x', workerSocketId: 'w1' } as never);
    expect(taskId).toBeTruthy();
    expect((service as unknown as { taskToWorker: Map<string, string> }).taskToWorker.size).toBe(1);

    // 客户端在任务完成前断开
    service.unregisterClient(socket);

    // worker 完成后响应到达（socket 已不存在）
    mock.getOnResponse()!({ taskId, clientId, sessionId: '', type: 'complete', data: null, timestamp: Date.now() });

    expect((service as unknown as { taskToWorker: Map<string, string> }).taskToWorker.size).toBe(0);
  });

  it('客户端断开时清理其活动任务的 taskToWorker 与 requestToTask', async () => {
    const socket = makeSocket('s2');
    const clientId = service.registerClient(socket);
    const taskId = await service.sendCommand(clientId, { command: 'x', workerSocketId: 'w1' } as never);

    // 模拟 worker 发出 approval-request → 写入 requestToTask
    mock.getOnResponse()!({ taskId, clientId, sessionId: '', type: 'approval-request', data: { requestId: 'r1' } } as never);
    expect((service as unknown as { requestToTask: Map<string, string> }).requestToTask.get('r1')).toBe(taskId);

    // 客户端断开（批准永不回应）
    service.unregisterClient(socket);

    expect((service as unknown as { taskToWorker: Map<string, string> }).taskToWorker.size).toBe(0);
    expect((service as unknown as { requestToTask: Map<string, string> }).requestToTask.size).toBe(0);
  });
});
