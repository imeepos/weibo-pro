/**
 * 微博用户历史发帖（mymblog）Visitor 测试的夹具与工具函数。
 */
import { vi } from 'vitest';
import { of } from 'rxjs';
import { WeiboAjaxStatusesMymblogAstVisitor } from '../../WeiboAjaxStatusesMymblogAstVisitor';

export interface MymblogUpsertTracker {
  sequence: string[];
  payloads: Map<string, any[]>;
}

/** 创建记录 upsert 顺序与载荷的追踪器 */
export function createUpsertTracker(): MymblogUpsertTracker {
  return { sequence: [], payloads: new Map() };
}

/** 构造追踪 upsert 顺序的 mock entity manager */
export function createMockManager(tracker: MymblogUpsertTracker) {
  return {
    create(entity: { name: string }, data: Record<string, unknown>) {
      return {
        ...data,
        __entity: entity.name,
      };
    },
    async upsert(entity: { name: string }, data: any[]) {
      tracker.sequence.push(entity.name);
      tracker.payloads.set(entity.name, data);
    },
    async find() {
      return [];
    },
  };
}

/** 构造带 mock 依赖的 visitor */
export function createMymblogVisitor(): WeiboAjaxStatusesMymblogAstVisitor {
  return new WeiboAjaxStatusesMymblogAstVisitor(
    {} as any,
    { randomDelay: vi.fn(), backoffDelay: vi.fn(), recordSuccess: vi.fn(), recordError: vi.fn() } as any,
    { acquire: vi.fn() } as any,
    { fetch: vi.fn() } as any,
  );
}

export interface MblogPostFixture {
  id?: string;
  idstr?: string;
  mid?: string;
  mblogid?: string;
  created_at?: string;
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 构造一条微博帖子 fixture，可用 overrides 覆盖任意字段 */
export function makeMblogPost(overrides: MblogPostFixture = {}): MblogPostFixture {
  return {
    id: 'post-1',
    idstr: 'post-1',
    mid: 'post-1',
    mblogid: 'post-1',
    created_at: new Date().toUTCString(),
    user: { id: 1800591743, idstr: '1800591743', screen_name: '作者' },
    ...overrides,
  };
}

/** 构造微博作者 user 对象 */
export function makeAuthor(id: number, name: string) {
  return {
    id,
    idstr: String(id),
    screen_name: name,
  };
}

/** 构造可重试的 fetch 超时错误 */
export function makeFetchTimeoutError() {
  const err = new TypeError('fetch failed');
  Object.assign(err, {
    cause: {
      code: 'UND_ERR_CONNECT_TIMEOUT',
      message: 'Connect Timeout Error',
    },
  });
  return err;
}

/** 订阅 visit 直到完成，返回全部事件 */
export async function runVisit(
  visitor: WeiboAjaxStatusesMymblogAstVisitor,
  ast: any,
  ctx: Record<string, unknown> = {},
  onNext?: (event: any) => void,
): Promise<any[]> {
  const events: any[] = [];
  await new Promise<void>((resolve, reject) => {
    visitor.visit(ast, of({ uid: ast.uid }) as any, ctx).subscribe({
      next: (event) => {
        events.push(event);
        onNext?.(event);
      },
      complete: resolve,
      error: reject,
    });
  });
  return events;
}
