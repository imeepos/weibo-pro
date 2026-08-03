import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  // 基础类型
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcNotification,
  // 客户端 → 服务器
  type ClientToServerMethod,
  type InitializeParams,
  type InitializeResult,
  type CallToolParams,
  type CallToolResult,
  type ReadResourceParams,
  type GetPromptParams,
  type CompleteParams,
  type SetLevelParams,
  // 服务器 → 客户端
  type ServerToClientMethod,
  type CreateMessageParams,
  type CreateMessageResult,
  type ListRootsResult,
  type CreateElicitationParams,
  type CreateElicitationResult,
  // 通知
  type NotificationMethod,
  type InitializedParams,
  type CancelledParams,
  type ProgressParams,
  type LoggingMessageParams,
  type ResourceUpdatedParams,
  type ResourceListChangedParams,
  type ToolListChangedParams,
  type PromptListChangedParams,
  type RootsListChangedParams,
  // 能力
  type ClientCapabilities,
  type ServerCapabilities,
  // 资源
  type Tool,
  type Resource,
  type ResourceContents,
  type Prompt,
  type PromptMessage,
  // 工具类型
  type RequestMethod,
  // 消息守卫（运行时）
  isRequest,
  isResponse,
  isNotification,
  isSuccessResponse,
  isErrorResponse,
} from '../message-types';

describe('消息类型守卫', () => {
  it('isRequest 识别 JSON-RPC 请求（含 id + method）', () => {
    expect(isRequest({ jsonrpc: '2.0', id: 1, method: 'ping' })).toBe(true);
    expect(isRequest({ jsonrpc: '2.0', id: 'abc', method: 'initialize', params: {} })).toBe(true);
    // 通知（无 id）不是请求
    expect(isRequest({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(false);
    // 响应（有 id 但无 method）不是请求
    expect(isRequest({ jsonrpc: '2.0', id: 1, result: 'ok' })).toBe(false);
  });

  it('isResponse 识别 JSON-RPC 响应（成功或错误）', () => {
    expect(isResponse({ jsonrpc: '2.0', id: 1, result: 'ok' })).toBe(true);
    expect(isResponse({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'bad' } })).toBe(true);
    expect(isResponse({ jsonrpc: '2.0', id: 1, method: 'ping' })).toBe(false);
    expect(isResponse({ jsonrpc: '2.0', method: 'ping' })).toBe(false);
  });

  it('isNotification 识别通知（无 id + method）', () => {
    expect(isNotification({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(true);
    expect(isNotification({ jsonrpc: '2.0', method: 'notifications/progress', params: { progressToken: 1, progress: 50 } })).toBe(true);
    expect(isNotification({ jsonrpc: '2.0', id: 1, method: 'ping' })).toBe(false);
    expect(isNotification({ jsonrpc: '2.0', id: 1, result: 'ok' })).toBe(false);
  });

  it('isSuccessResponse / isErrorResponse 区分成功与错误响应', () => {
    expect(isSuccessResponse({ jsonrpc: '2.0', id: 1, result: 'ok' })).toBe(true);
    expect(isSuccessResponse({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'bad' } })).toBe(false);
    expect(isErrorResponse({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'bad' } })).toBe(true);
    expect(isErrorResponse({ jsonrpc: '2.0', id: 1, result: 'ok' })).toBe(false);
  });
});

describe('公开 API 契约（编译期）', () => {
  it('barrel 导出全部 44 个名字', () => {
    // 上面 import 语句本身就是编译期契约：任一名字未被重导出，tsc 将报错。
    const runtimeGuards = [
      isRequest,
      isResponse,
      isNotification,
      isSuccessResponse,
      isErrorResponse,
    ];
    expect(runtimeGuards).toHaveLength(5);
    for (const guard of runtimeGuards) {
      expect(typeof guard).toBe('function');
    }
  });

  it('JSON-RPC 基础类型结构保持不变', () => {
    expectTypeOf<JsonRpcMessage>().toEqualTypeOf<{ jsonrpc: '2.0' }>();
    expectTypeOf<JsonRpcRequest>().toEqualTypeOf<{
      jsonrpc: '2.0';
      id: string | number;
      method: string;
      params?: Record<string, any>;
    }>();
    expectTypeOf<JsonRpcSuccessResponse>().toEqualTypeOf<{
      jsonrpc: '2.0';
      id: string | number;
      result: any;
    }>();
    expectTypeOf<JsonRpcErrorResponse>().toEqualTypeOf<{
      jsonrpc: '2.0';
      id: string | number;
      error: { code: number; message: string; data?: any };
    }>();
    expectTypeOf<JsonRpcResponse>().toEqualTypeOf<
      JsonRpcSuccessResponse | JsonRpcErrorResponse
    >();
    expectTypeOf<JsonRpcNotification>().toEqualTypeOf<{
      jsonrpc: '2.0';
      method: string;
      params?: Record<string, any>;
    }>();
  });

  it('方法联合类型包含关键值', () => {
    const c2s: ClientToServerMethod = 'tools/call';
    const s2c: ServerToClientMethod = 'sampling/createMessage';
    const notif: NotificationMethod = 'notifications/progress';
    const req: RequestMethod = 'initialize';
    const req2: RequestMethod = 'elicitation/create';

    expect(c2s).toBe('tools/call');
    expect(s2c).toBe('sampling/createMessage');
    expect(notif).toBe('notifications/progress');
    expect(req).toBe('initialize');
    expect(req2).toBe('elicitation/create');
    expectTypeOf<RequestMethod>().toEqualTypeOf<ClientToServerMethod | ServerToClientMethod>();
  });

  it('关键领域类型结构保持兼容', () => {
    expectTypeOf<InitializeParams>().toMatchTypeOf<{
      protocolVersion: string;
      capabilities: ClientCapabilities;
      clientInfo: { name: string; version: string };
    }>();
    expectTypeOf<InitializeResult>().toMatchTypeOf<{
      protocolVersion: string;
      capabilities: ServerCapabilities;
    }>();
    expectTypeOf<CallToolParams>().toMatchTypeOf<{ name: string; arguments?: Record<string, any> }>();
    expectTypeOf<CallToolResult>().toMatchTypeOf<{
      content: Array<{ type: 'text' | 'image' | 'resource'; text?: string; data?: string; mimeType?: string }>;
      isError?: boolean;
    }>();
    expectTypeOf<CreateMessageParams>().toMatchTypeOf<{
      messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text' | 'image'; text?: string; data?: string; mimeType?: string } }>;
      systemPrompt?: string;
      maxTokens?: number;
    }>();
    expectTypeOf<CancelledParams>().toMatchTypeOf<{ requestId: string | number; reason?: string }>();
    expectTypeOf<ProgressParams>().toMatchTypeOf<{ progressToken: string | number; progress: number; total?: number }>();
    expectTypeOf<ClientCapabilities>().toMatchTypeOf<{ sampling?: Record<string, any>; experimental?: Record<string, any> }>();
    expectTypeOf<ServerCapabilities>().toMatchTypeOf<{ tools?: { listChanged?: boolean }; logging?: Record<string, any> }>();
    expectTypeOf<Tool>().toMatchTypeOf<{ name: string; inputSchema: { type: 'object'; properties?: Record<string, any>; required?: string[] } }>();
    expectTypeOf<Resource>().toMatchTypeOf<{ uri: string; name: string; mimeType?: string }>();
    expectTypeOf<Prompt>().toMatchTypeOf<{ name: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }>();
  });
});
