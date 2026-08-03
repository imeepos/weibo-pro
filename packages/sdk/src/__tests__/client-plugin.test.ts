import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Observable } from 'rxjs';
import { root } from '@sker/core';
import { BETTER_FETCH, BETTER_STORE, BETTER_OPTIONS } from '../tokens';
import { createSkerClientPlugin } from '../client-plugin';
import { WorkflowController } from '../controllers/workflow.controller';

// Import the package index so every @Controller decorator registers with root
// (李代桃僵 reads root.get(CONTROLLES, []) at plugin creation time).
import '../index';

/**
 * 共享的 $fetch mock。
 *
 * createMethodProxy 内部通过 root.get(BETTER_FETCH) 读取 $fetch，而 root 是
 * 全局单例，第一次 get 后实例会被缓存。因此整个文件共用同一个 mock 实例，
 * 通过 mockClear()/mockResolvedValue() 在用例之间隔离调用记录与返回值。
 */
const mockFetch = vi.fn();
const mockStore: Record<string, unknown> = {};
const mockOptions = { baseURL: 'http://localhost:8089' };

const DEFAULT_RESPONSE = { data: { success: true, data: 'RESULT' }, error: null };

/**
 * BetterAuthClientPlugin 中 getActions/pathMethods 是可选字段，
 * 而 createSkerClientPlugin 保证始终提供它们。这里用本地形状收窄类型。
 */
interface SkerPluginShape {
  id: string;
  getActions: ($fetch: unknown, $store: unknown, options: unknown) => Record<string, any>;
  pathMethods: Record<string, 'GET' | 'POST'>;
}

function makePlugin(): SkerPluginShape {
  return createSkerClientPlugin() as unknown as SkerPluginShape;
}

describe('client-plugin', () => {
  let actions: Record<string, any>;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(DEFAULT_RESPONSE);
    actions = makePlugin().getActions(
      mockFetch as any,
      mockStore as any,
      mockOptions as any,
    );
  });

  describe('createSkerClientPlugin', () => {
    it('returns a valid plugin structure (id="sker", getActions, pathMethods)', () => {
      const plugin = makePlugin();

      expect(plugin.id).toBe('sker');
      expect(typeof plugin.getActions).toBe('function');
      expect(plugin.pathMethods).toBeDefined();
      expect(Object.keys(plugin.pathMethods).length).toBeGreaterThan(0);
    });
  });

  describe('registerControllerProxies (李代桃僵)', () => {
    it('registers BETTER_FETCH / BETTER_STORE / BETTER_OPTIONS into root DI', () => {
      expect(root.get(BETTER_FETCH)).toBe(mockFetch);
      expect(root.get(BETTER_STORE)).toBe(mockStore);
      expect(root.get(BETTER_OPTIONS)).toBe(mockOptions);
    });

    it('replaces a Controller with an HTTP proxy', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: [{ id: 'w1' }] }, error: null });

      const workflowProxy = root.get(WorkflowController) as any;

      expect(workflowProxy).not.toBeInstanceOf(WorkflowController);
      expect(typeof workflowProxy.listWorkflows).toBe('function');

      const result = await workflowProxy.listWorkflows();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/workflow/list',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual([{ id: 'w1' }]);
    });
  });

  describe('buildBetterAuthActions', () => {
    it('groups controller methods by controller name', () => {
      expect(actions.workflow).toBeDefined();
      expect(typeof actions.workflow.listWorkflows).toBe('function');
      expect(typeof actions.workflow.saveWorkflow).toBe('function');
      expect(typeof actions.workflow.execute).toBe('function');
      expect(typeof actions.login.getStatus).toBe('function');
      expect(typeof actions.posts.getPendingNLPPosts).toBe('function');
    });

    it('GET action issues a GET request without body', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: [{ id: 'w1' }] }, error: null });

      const result = await actions.workflow.listWorkflows();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/workflow/list', {
        method: 'GET',
        query: {},
        body: undefined,
        throw: false,
      });
      expect(result).toEqual([{ id: 'w1' }]);
    });

    it('POST action sends the @Body payload', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: { id: 'wf1' } }, error: null });

      const body = { name: 'test', nodes: [{ id: 'n1' }] };
      const result = await actions.workflow.saveWorkflow(body);

      expect(mockFetch).toHaveBeenCalledWith('/workflow/save', {
        method: 'POST',
        query: {},
        body,
        throw: false,
      });
      expect(result).toEqual({ id: 'wf1' });
    });

    it('replaces @Param placeholders in the URL path', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: { url: 'x' } }, error: null });

      await actions.login.getStatus('weibo');

      expect(mockFetch).toHaveBeenCalledWith('/login/weibo/status', {
        method: 'GET',
        query: {},
        body: undefined,
        throw: false,
      });
    });

    it('passes keyed @Query params through to $fetch', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        data: { success: true, data: { posts: [], hasMore: false, cursor: null } },
        error: null,
      });

      await actions.posts.getPendingNLPPosts('cursor-abc', 20);

      expect(mockFetch).toHaveBeenCalledWith('/posts/pending-nlp', {
        method: 'GET',
        query: { cursor: 'cursor-abc', pageSize: 20 },
        body: undefined,
        throw: false,
      });
    });

    it('builds a keyed @Body payload from a single argument', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: { success: true } }, error: null });

      await actions.workflow.deleteSchedule('sched-1');

      expect(mockFetch).toHaveBeenCalledWith('/workflow/deleteSchedule', {
        method: 'POST',
        query: {},
        body: { scheduleId: 'sched-1' },
        throw: false,
      });
    });

    it('uses DELETE for @Delete decorated methods', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: { success: true } }, error: null });

      await actions.workflow.deleteWorkflow({ id: 'wf-1' });

      expect(mockFetch).toHaveBeenCalledWith('/workflow/deleteWorkflow', {
        method: 'DELETE',
        query: {},
        body: { id: 'wf-1' },
        throw: false,
      });
    });

    it('uses PUT for @Put decorated methods', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: { status: 'ok' } }, error: null });

      await actions.workflow.updateSchedule('sched-1', { name: 'new' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/workflow/updateSchedule',
        expect.objectContaining({ method: 'PUT', body: { name: 'new' } }),
      );
    });

    it('unwraps { success: true, data } API envelope', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: true, data: { id: '1' } }, error: null });

      await expect(actions.workflow.listWorkflows()).resolves.toEqual({ id: '1' });
    });

    it('returns raw data when the response has no success envelope', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { foo: 'bar' }, error: null });

      await expect(actions.workflow.listWorkflows()).resolves.toEqual({ foo: 'bar' });
    });

    it('throws when $fetch reports an error', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: null, error: { message: 'boom' } });

      await expect(actions.workflow.listWorkflows()).rejects.toThrow('API error: boom');
    });

    it('throws when the API envelope reports failure', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({ data: { success: false, data: null }, error: null });

      await expect(actions.workflow.listWorkflows()).rejects.toThrow('API error');
    });
  });

  describe('SSE endpoints', () => {
    it('returns an Observable instead of issuing a $fetch request', () => {
      const result = actions.workflow.execute({ ast: {} });

      expect(result).toBeInstanceOf(Observable);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('streams SSE events through global fetch', async () => {
      const realFetch = globalThis.fetch;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"event":"done","progress":1}\n\n'));
          controller.close();
        },
      });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, body: stream });
      globalThis.fetch = fetchSpy as any;

      try {
        const obs = actions.workflow.execute({ ast: {} });
        const events: unknown[] = [];

        await new Promise<void>((resolve) => {
          obs.subscribe({
            next: (event: unknown) => events.push(event),
            complete: () => resolve(),
            error: () => resolve(),
          });
        });

        expect(fetchSpy).toHaveBeenCalledWith(
          'http://localhost:8089/workflow/execute',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ Accept: 'text/event-stream' }),
          }),
        );
        expect(events).toEqual([{ event: 'done', progress: 1 }]);
      } finally {
        globalThis.fetch = realFetch;
      }
    });
  });

  describe('generatePathMethods', () => {
    it('maps route paths to HTTP methods', () => {
      const plugin = makePlugin();

      expect(plugin.pathMethods['/workflow/list']).toBe('GET');
      expect(plugin.pathMethods['/workflow/save']).toBe('POST');
      expect(plugin.pathMethods['/login/:platform/status']).toBe('GET');
      expect(plugin.pathMethods['/login/:platform/qrcode']).toBe('POST');
      expect(plugin.pathMethods['/posts/pending-nlp']).toBe('GET');
    });

    it('maps DELETE/PUT to POST and excludes SSE endpoints', () => {
      const plugin = makePlugin();

      expect(plugin.pathMethods['/workflow/deleteWorkflow']).toBe('POST');
      expect(plugin.pathMethods['/workflow/updateSchedule']).toBe('POST');
      expect(plugin.pathMethods['/workflow/execute']).toBeUndefined();
      expect(plugin.pathMethods['/workflow/executeNode']).toBeUndefined();
    });
  });
});
