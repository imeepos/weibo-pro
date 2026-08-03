import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { useEntityManager } from '@sker/entities';
import {
  createUpsertTracker,
  createMockManager,
  createMymblogVisitor,
  makeMblogPost,
  makeAuthor,
  makeFetchTimeoutError,
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

describe('WeiboAjaxStatusesMymblogAstVisitor.retry', () => {
  const tracker = createUpsertTracker();

  beforeEach(() => {
    tracker.sequence.length = 0;
    tracker.payloads.clear();

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      return handler(createMockManager(tracker));
    });
  });

  it('keeps the workflow successful and emits progress when a later page exhausts retries', async () => {
    vi.stubEnv('USER_HISTORY_PAGE_MAX_RETRIES', '0');

    const visitor = createMymblogVisitor();

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            makeMblogPost({
              user: makeAuthor(1001, '作者A'),
            }),
          ],
        },
      })
      .mockRejectedValueOnce(makeFetchTimeoutError());

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    const events: Array<{ type: string; data?: Record<string, unknown>; error?: string }> = [];

    await runVisit(visitor, ast, {}, (event) => events.push(event));

    expect(events.some((event) => event.type === 'node_progress')).toBe(true);
    expect(events.some((event) => event.type === 'node_fail')).toBe(false);
    expect(events.some((event) => event.type === 'node_success')).toBe(true);
  });

  it('treats bare fetch failed as retryable and returns partial progress instead of failing', async () => {
    vi.stubEnv('USER_HISTORY_PAGE_MAX_RETRIES', '0');

    const visitor = createMymblogVisitor();

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            makeMblogPost({
              user: makeAuthor(1001, '作者A'),
            }),
          ],
        },
      })
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    const events: Array<{ type: string; data?: Record<string, unknown>; error?: string }> = [];

    await runVisit(visitor, ast, {}, (event) => events.push(event));

    expect(events.some((event) => event.type === 'node_fail')).toBe(false);
    expect(events.some((event) => event.type === 'node_success')).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === 'node_progress' &&
          String(event.data?.message ?? '').includes('已结束抓取并继续分析'),
      ),
    ).toBe(true);
  });
});
