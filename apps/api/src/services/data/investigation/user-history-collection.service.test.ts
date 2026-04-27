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
});
