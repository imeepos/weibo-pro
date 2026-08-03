import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerGateway } from './worker-gateway';

/** 可捕获事件处理器的 mock socket */
function makeMockSocket(id: string) {
  const handlers: Record<string, (data?: unknown) => void> = {};
  return {
    id,
    emit: vi.fn(),
    on: (evt: string, cb: (data?: unknown) => void) => {
      handlers[evt] = cb;
    },
    getHandler: (evt: string) => handlers[evt],
    handshake: { auth: {} },
    disconnect: vi.fn(),
  };
}

function setupGateway() {
  const gateway = new WorkerGateway();
  let connectionHandler: ((socket: ReturnType<typeof makeMockSocket>) => void) | undefined;
  const workerNs = {
    on: (evt: string, cb: (socket: ReturnType<typeof makeMockSocket>) => void) => {
      if (evt === 'connection') connectionHandler = cb;
    },
  };
  const io = { of: vi.fn().mockReturnValue(workerNs) };
  gateway.initialize(io as never);
  return { gateway, getConnectionHandler: () => connectionHandler };
}

const baseCommand: import('./types').ClaudeCommand = {
  taskId: 't1',
  clientId: 'c1',
  sessionId: 's1',
  command: 'echo hi',
  cwd: '/tmp',
  model: 'sonnet',
  permissionMode: 'default',
  timestamp: Date.now(),
};

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * worker-gateway.ts:34 responseCallbacks 仅在收到 complete/error 响应时删除。
 * 若 worker 中途断开（disconnect 处理器只删 workerConnections，不清理该 worker 的待决回调），
 * 回调闭包（含整个命令上下文）永久滞留。
 */
describe('WorkerGateway 待决回调泄漏修复', () => {
  let gateway: WorkerGateway;
  let connectionHandler: ((socket: ReturnType<typeof makeMockSocket>) => void) | undefined;

  beforeEach(() => {
    const setup = setupGateway();
    gateway = setup.gateway;
    connectionHandler = setup.getConnectionHandler();
    vi.clearAllMocks();
  });

  it('worker 断开时，其待决 responseCallbacks 被清理', () => {
    const workerSocket = makeMockSocket('worker-1');
    connectionHandler!(workerSocket);

    const onResponse = vi.fn();
    gateway.sendCommand(baseCommand, onResponse, 'worker-1');
    expect((gateway as unknown as { responseCallbacks: Map<string, unknown> }).responseCallbacks.size).toBe(1);

    // worker 断开
    workerSocket.getHandler('disconnect')!();

    // 修复前：回调残留 → 模拟迟到的响应仍会触发回调
    workerSocket.getHandler('worker:response')!({ taskId: 't1', clientId: 'c1', sessionId: 's1', type: 'complete', data: null });

    expect(onResponse).not.toHaveBeenCalled();
    expect((gateway as unknown as { responseCallbacks: Map<string, unknown> }).responseCallbacks.size).toBe(0);
  });
});
