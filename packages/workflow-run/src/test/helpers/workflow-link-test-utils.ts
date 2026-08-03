/**
 * workflow 链路集成测试的工具函数。
 */
import { vi } from 'vitest';
import { Observable, type Subscriber } from 'rxjs';
import type { WeiboLoginAst } from '@sker/workflow-ast';
import type { NodeEvent } from '@sker/workflow';

/** 构造微博登录 mock 服务，覆盖 root 容器中的 WeiboAuthService */
export function createMockAuthService() {
  return {
    startLogin: vi.fn((ast: WeiboLoginAst, obs: Subscriber<NodeEvent>) => {
      obs.next({
        type: 'node_emit',
        id: ast.id,
        data: { qrcode: 'https://weibo.com/qrcode/mock', message: '请扫码登录' },
      });
      ast.account = { id: 'mock-account', nickname: '测试账号' } as never;
      obs.next({
        type: 'node_emit',
        id: ast.id,
        data: { account: ast.account, message: '登录成功' },
      });
      ast.state = 'success';
      obs.next({ type: 'node_success', id: ast.id });
      obs.complete();
    }),
    cancelSession: vi.fn(),
  };
}

/** 收集 Observable 事件并带上超时保护 */
export function collectEvents(source: Observable<NodeEvent>, timeoutMs = 8000) {
  return new Promise<NodeEvent[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`链路执行超时（${timeoutMs}ms）`)), timeoutMs);
    const events: NodeEvent[] = [];
    source.subscribe({
      next: (event) => events.push(event),
      error: (err) => {
        clearTimeout(timer);
        reject(err);
      },
      complete: () => {
        clearTimeout(timer);
        resolve(events);
      },
    });
  });
}
