import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { getInjectMetadata } from '@sker/core';
import { UserHistoryCollectionService } from './user-history-collection.service';
import { WeiboAjaxStatusesMymblogAstVisitor } from '@sker/workflow-run';

describe('UserHistoryCollectionService', () => {
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
});
