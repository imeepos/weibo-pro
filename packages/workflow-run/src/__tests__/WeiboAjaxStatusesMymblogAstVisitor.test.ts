import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { WeiboAjaxStatusesMymblogAstVisitor } from '../WeiboAjaxStatusesMymblogAstVisitor';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { PostSnapshotHelper, useEntityManager } from '@sker/entities';

vi.mock('@sker/entities', () => {
  class WeiboPostEntity {}
  class WeiboUserEntity {}

  return {
    useEntityManager: vi.fn(),
    WeiboPostEntity,
    WeiboUserEntity,
    PostSnapshotHelper: {
      createSnapshots: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('WeiboAjaxStatusesMymblogAstVisitor', () => {
  const upsertSequence: string[] = [];
  const upsertPayloads = new Map<string, any[]>();

  beforeEach(() => {
    upsertSequence.length = 0;
    upsertPayloads.clear();

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      const manager = {
        create(entity: { name: string }, data: Record<string, unknown>) {
          return {
            ...data,
            __entity: entity.name,
          };
        },
        async upsert(entity: { name: string }, data: any[]) {
          upsertSequence.push(entity.name);
          upsertPayloads.set(entity.name, data);
        },
      };

      return handler(manager);
    });
  });

  it('upserts timeline authors before their posts', async () => {
    const visitor = new WeiboAjaxStatusesMymblogAstVisitor(
      {} as any,
      { randomDelay: vi.fn(), backoffDelay: vi.fn(), recordSuccess: vi.fn(), recordError: vi.fn() } as any,
      { acquire: vi.fn() } as any,
      { fetch: vi.fn() } as any,
    );

    vi.spyOn(visitor as any, 'fetchWithPagination').mockImplementation(async function* () {
      yield {
        data: {
          list: [
            {
              id: 'post-1',
              idstr: 'post-1',
              mid: 'post-1',
              mblogid: 'post-1',
              user: {
                id: 1800591743,
                idstr: '1800591743',
                screen_name: '转发作者',
              },
            },
          ],
        },
      };
    });

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    await new Promise<void>((resolve, reject) => {
      visitor.visit(
        ast,
        of({ uid: '1571999832' }) as any,
        {},
      ).subscribe({
        complete: resolve,
        error: reject,
      });
    });

    expect(upsertSequence).toEqual(['WeiboUserEntity', 'WeiboPostEntity']);
    expect(PostSnapshotHelper.createSnapshots).toHaveBeenCalledOnce();
  });

  it('stops ingesting when posts fall outside the requested history window', async () => {
    const visitor = new WeiboAjaxStatusesMymblogAstVisitor(
      {} as any,
      { randomDelay: vi.fn(), backoffDelay: vi.fn(), recordSuccess: vi.fn(), recordError: vi.fn() } as any,
      { acquire: vi.fn() } as any,
      { fetch: vi.fn() } as any,
    );

    let visitedPages = 0;
    vi.spyOn(visitor as any, 'fetchWithPagination').mockImplementation(async function* () {
      visitedPages += 1;
      yield {
        data: {
          list: [
            {
              id: 'recent-post',
              idstr: 'recent-post',
              mid: 'recent-post',
              mblogid: 'recent-post',
              created_at: new Date().toUTCString(),
              user: {
                id: 1001,
                idstr: '1001',
                screen_name: '最近作者',
              },
            },
            {
              id: 'old-post',
              idstr: 'old-post',
              mid: 'old-post',
              mblogid: 'old-post',
              created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toUTCString(),
              user: {
                id: 1002,
                idstr: '1002',
                screen_name: '旧作者',
              },
            },
          ],
        },
      };
      visitedPages += 1;
      yield {
        data: {
          list: [
            {
              id: 'older-post',
              idstr: 'older-post',
              mid: 'older-post',
              mblogid: 'older-post',
              created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toUTCString(),
              user: {
                id: 1003,
                idstr: '1003',
                screen_name: '更旧作者',
              },
            },
          ],
        },
      };
    });

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    await new Promise<void>((resolve, reject) => {
      visitor.visit(
        ast,
        of({ uid: '1571999832' }) as any,
        { windowDays: 90 },
      ).subscribe({
        complete: resolve,
        error: reject,
      });
    });

    expect(visitedPages).toBe(1);
    expect(upsertPayloads.get('WeiboUserEntity')).toHaveLength(1);
    expect(upsertPayloads.get('WeiboPostEntity')).toHaveLength(1);
    expect(upsertPayloads.get('WeiboPostEntity')?.[0]?.id).toBe('recent-post');
  });
});
