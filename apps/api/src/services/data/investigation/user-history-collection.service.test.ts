import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInjectMetadata } from '@sker/core';
import { UserHistoryCollectionService } from './user-history-collection.service';
import { WeiboAjaxStatusesMymblogAstVisitor } from '@sker/workflow-run';

describe('UserHistoryCollectionService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('declares a concrete visitor token for DI metadata', () => {
    const injectMetadata = getInjectMetadata(UserHistoryCollectionService);

    expect(injectMetadata?.[0]).toBe(WeiboAjaxStatusesMymblogAstVisitor);
  });

  it('uses WeiboAjaxStatusesMymblogAstVisitor to backfill user timeline posts', async () => {
    const visitor = {
      visit: vi.fn().mockReturnValue({
        subscribe: ({ complete }: { complete: () => void }) => {
          complete();
          return { unsubscribe: vi.fn() };
        },
      }),
    };

    const service = new UserHistoryCollectionService(visitor as any);

    await service.collect({ weiboUserId: '123', uid: '123', windowDays: 90, taskId: 'task-1' });

    expect(visitor.visit).toHaveBeenCalled();
  });

  it('rejects when the visitor emits a node_fail event before completion', async () => {
    const visitor = {
      visit: vi.fn().mockReturnValue({
        subscribe: ({
          next,
          complete,
        }: {
          next?: (event: { type: string; error?: string }) => void;
          complete: () => void;
        }) => {
          next?.({ type: 'node_fail', error: '没有可用的微博账号' });
          complete();
          return { unsubscribe: vi.fn() };
        },
      }),
    };

    const service = new UserHistoryCollectionService(visitor as any);

    await expect(
      service.collect({ weiboUserId: '123', uid: '123', windowDays: 90, taskId: 'task-1' }),
    ).rejects.toThrow('没有可用的微博账号');
  });

  it('returns a partial result and unsubscribes when timeline collection stops producing progress', async () => {
    vi.useFakeTimers();
    vi.stubEnv('USER_HISTORY_COLLECTION_NO_PROGRESS_TIMEOUT_MS', '1000');
    vi.stubEnv('USER_HISTORY_COLLECTION_NO_PROGRESS_RETRY_LIMIT', '0');

    const unsubscribe = vi.fn();
    const visitor = {
      visit: vi.fn().mockReturnValue({
        subscribe: () => ({ unsubscribe }),
      }),
    };

    const service = new UserHistoryCollectionService(visitor as any);

    const pending = service.collect({
      weiboUserId: '123',
      uid: '123',
      windowDays: 90,
      taskId: 'task-1',
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toMatchObject({
      status: 'partial',
    });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('retries stalled collection before returning partial', async () => {
    vi.useFakeTimers();
    vi.stubEnv('USER_HISTORY_COLLECTION_NO_PROGRESS_TIMEOUT_MS', '1000');
    vi.stubEnv('USER_HISTORY_COLLECTION_NO_PROGRESS_RETRY_LIMIT', '2');

    const visit = vi
      .fn()
      .mockReturnValueOnce({ subscribe: () => ({ unsubscribe: vi.fn() }) })
      .mockReturnValueOnce({ subscribe: () => ({ unsubscribe: vi.fn() }) })
      .mockReturnValueOnce({ subscribe: () => ({ unsubscribe: vi.fn() }) });

    const service = new UserHistoryCollectionService({ visit } as any);
    const pending = service.collect({
      weiboUserId: '123',
      uid: '123',
      windowDays: 90,
      taskId: 'task-1',
    });

    await vi.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toMatchObject({
      status: 'partial',
      warnings: expect.arrayContaining([
        '历史发帖抓取长时间无进展，第 2 次重试后结束抓取并继续分析',
      ]),
    });
  });
});
