import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { PostSnapshotHelper, useEntityManager } from '@sker/entities';
import {
  createUpsertTracker,
  createMockManager,
  createMymblogVisitor,
  makeMblogPost,
  makeAuthor,
  runVisit,
} from '../test/helpers/weibo-mymblog-test-utils';

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

describe('WeiboAjaxStatusesMymblogAstVisitor.ingest', () => {
  const tracker = createUpsertTracker();

  beforeEach(() => {
    tracker.sequence.length = 0;
    tracker.payloads.clear();

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      return handler(createMockManager(tracker));
    });
  });

  it('upserts timeline authors before their posts', async () => {
    const visitor = createMymblogVisitor();

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            makeMblogPost({
              user: makeAuthor(1800591743, '转发作者'),
            }),
          ],
        },
      })
      .mockResolvedValueOnce({ data: { list: [] } });

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    await runVisit(visitor, ast, {});

    expect(tracker.sequence).toEqual(['WeiboUserEntity', 'WeiboPostEntity']);
    expect(PostSnapshotHelper.createSnapshots).toHaveBeenCalledOnce();
  });

  it('stops ingesting when posts fall outside the requested history window', async () => {
    const visitor = createMymblogVisitor();

    const fetchApiSpy = vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            makeMblogPost({
              id: 'recent-post',
              idstr: 'recent-post',
              mid: 'recent-post',
              mblogid: 'recent-post',
              created_at: new Date().toUTCString(),
              user: makeAuthor(1001, '最近作者'),
            }),
            makeMblogPost({
              id: 'old-post',
              idstr: 'old-post',
              mid: 'old-post',
              mblogid: 'old-post',
              created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toUTCString(),
              user: makeAuthor(1002, '旧作者'),
            }),
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          list: [
            makeMblogPost({
              id: 'older-post',
              idstr: 'older-post',
              mid: 'older-post',
              mblogid: 'older-post',
              created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toUTCString(),
              user: makeAuthor(1003, '更旧作者'),
            }),
          ],
        },
      });

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    await runVisit(visitor, ast, { windowDays: 90 });

    expect(fetchApiSpy).toHaveBeenCalledTimes(1);
    expect(tracker.payloads.get('WeiboUserEntity')).toHaveLength(1);
    expect(tracker.payloads.get('WeiboPostEntity')).toHaveLength(1);
    expect(tracker.payloads.get('WeiboPostEntity')?.[0]?.id).toBe('recent-post');
  });

  it('drops unresolved author ids before upserting posts', async () => {
    const visitor = createMymblogVisitor();

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            makeMblogPost({
              user: makeAuthor(1807436544, '作者A'),
            }),
          ],
        },
      })
      .mockResolvedValueOnce({ data: { list: [] } });

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    await runVisit(visitor, ast, {});

    expect(tracker.payloads.get('WeiboPostEntity')?.[0]?.user_id).toBeNull();
  });
});
