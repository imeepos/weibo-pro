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

  beforeEach(() => {
    upsertSequence.length = 0;

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      const manager = {
        create(entity: { name: string }, data: Record<string, unknown>) {
          return {
            ...data,
            __entity: entity.name,
          };
        },
        async upsert(entity: { name: string }) {
          upsertSequence.push(entity.name);
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
});
