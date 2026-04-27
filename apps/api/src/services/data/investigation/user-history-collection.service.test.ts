import { describe, expect, it, vi } from 'vitest';
import { UserHistoryCollectionService } from './user-history-collection.service';

describe('UserHistoryCollectionService', () => {
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
