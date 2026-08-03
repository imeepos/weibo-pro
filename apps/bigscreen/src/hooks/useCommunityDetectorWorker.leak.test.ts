import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommunityDetectorWorker } from './useCommunityDetectorWorker';

// Fake Worker：记录实例，terminate/postMessage 均为 jest.fn
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: any) => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(_url: string | URL, _options?: WorkerOptions) {
    FakeWorker.instances.push(this);
  }
}

describe('useCommunityDetectorWorker 内存泄漏', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.clearAllMocks();
    FakeWorker.instances = [];
    globalThis.Worker = FakeWorker as any;
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
  });

  it('组件卸载时应该终止 Worker，释放线程（避免内存泄漏）', () => {
    const { result, unmount } = renderHook(() => useCommunityDetectorWorker());

    // 空数组不会命中 nodes.length > 10000 保护，正常走创建 Worker 分支
    act(() => {
      result.current.detect([], []);
    });

    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0];

    // 未卸载前不应终止
    expect(worker.terminate).not.toHaveBeenCalled();

    // 卸载后应终止 Worker，避免线程泄漏
    unmount();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
