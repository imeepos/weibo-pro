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
        async find() {
          return [];
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

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ data: { list: [] } });

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

    const fetchApiSpy = vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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

    expect(fetchApiSpy).toHaveBeenCalledTimes(1);
    expect(upsertPayloads.get('WeiboUserEntity')).toHaveLength(1);
    expect(upsertPayloads.get('WeiboPostEntity')).toHaveLength(1);
    expect(upsertPayloads.get('WeiboPostEntity')?.[0]?.id).toBe('recent-post');
  });

  it('drops unresolved author ids before upserting posts', async () => {
    const visitor = new WeiboAjaxStatusesMymblogAstVisitor(
      {} as any,
      { randomDelay: vi.fn(), backoffDelay: vi.fn(), recordSuccess: vi.fn(), recordError: vi.fn() } as any,
      { acquire: vi.fn() } as any,
      { fetch: vi.fn() } as any,
    );

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            {
              id: 'post-1',
              idstr: 'post-1',
              mid: 'post-1',
              mblogid: 'post-1',
              created_at: new Date().toUTCString(),
              user: {
                id: 1807436544,
                idstr: '1807436544',
                screen_name: '作者A',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { list: [] } });

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

    expect(upsertPayloads.get('WeiboPostEntity')?.[0]?.user_id).toBeNull();
  });

  it('keeps the workflow successful and emits progress when a later page exhausts retries', async () => {
    vi.stubEnv('USER_HISTORY_PAGE_MAX_RETRIES', '0');

    const visitor = new WeiboAjaxStatusesMymblogAstVisitor(
      {} as any,
      { randomDelay: vi.fn(), backoffDelay: vi.fn(), recordSuccess: vi.fn(), recordError: vi.fn() } as any,
      { acquire: vi.fn() } as any,
      { fetch: vi.fn() } as any,
    );

    const retryableError = new TypeError('fetch failed');
    Object.assign(retryableError, {
      cause: {
        code: 'UND_ERR_CONNECT_TIMEOUT',
        message: 'Connect Timeout Error',
      },
    });

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            {
              id: 'post-1',
              idstr: 'post-1',
              mid: 'post-1',
              mblogid: 'post-1',
              created_at: new Date().toUTCString(),
              user: {
                id: 1001,
                idstr: '1001',
                screen_name: '作者A',
              },
            },
          ],
        },
      })
      .mockRejectedValueOnce(retryableError);

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    const events: Array<{ type: string; data?: Record<string, unknown>; error?: string }> = [];

    await new Promise<void>((resolve, reject) => {
      visitor.visit(
        ast,
        of({ uid: '1571999832' }) as any,
        {},
      ).subscribe({
        next: (event) => events.push(event as any),
        complete: resolve,
        error: reject,
      });
    });

    expect(events.some((event) => event.type === 'node_progress')).toBe(true);
    expect(events.some((event) => event.type === 'node_fail')).toBe(false);
    expect(events.some((event) => event.type === 'node_success')).toBe(true);
  });

  it('treats bare fetch failed as retryable and returns partial progress instead of failing', async () => {
    vi.stubEnv('USER_HISTORY_PAGE_MAX_RETRIES', '0');

    const visitor = new WeiboAjaxStatusesMymblogAstVisitor(
      {} as any,
      { randomDelay: vi.fn(), backoffDelay: vi.fn(), recordSuccess: vi.fn(), recordError: vi.fn() } as any,
      { acquire: vi.fn() } as any,
      { fetch: vi.fn() } as any,
    );

    vi.spyOn(visitor as any, 'fetchApi')
      .mockResolvedValueOnce({
        data: {
          list: [
            {
              id: 'post-1',
              idstr: 'post-1',
              mid: 'post-1',
              mblogid: 'post-1',
              created_at: new Date().toUTCString(),
              user: {
                id: 1001,
                idstr: '1001',
                screen_name: '作者A',
              },
            },
          ],
        },
      })
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = '1571999832';

    const events: Array<{ type: string; data?: Record<string, unknown>; error?: string }> = [];

    await new Promise<void>((resolve, reject) => {
      visitor.visit(
        ast,
        of({ uid: '1571999832' }) as any,
        {},
      ).subscribe({
        next: (event) => events.push(event as any),
        complete: resolve,
        error: reject,
      });
    });

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
