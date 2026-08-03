import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LlmProxyService } from './llm-proxy.service';
import { mockEntityManager } from '../test-setup';
import { selectProviderWithLoadBalancing } from './llm-proxy/load-balancer';
import { isThinkingError } from './llm-proxy/thinking-error';
import { buildCodexResponseFromStream } from './llm-proxy/codex-stream-builder';
import { createSSELineStream, createSSEDataStream, createJSONParseStream } from './llm-proxy/sse-stream';
import { normalizeProxyRequest } from './llm-proxy/request-normalizer';
import { extractTextContent } from './llm-proxy/text-extract';
import { ProtocolConverter } from './llm-proxy/protocol-converter';

// Mock useEntityManager
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

/** 构造支持 findProvider / updateScore 查询链的 mock */
function createQbStub(candidates: any[]) {
    let kind: 'tier' | 'provider' = 'tier';
    const qb: any = {
        innerJoin: () => qb,
        select: (cols: string) => {
            if (cols === 'provider.id') kind = 'provider';
            return qb;
        },
        addSelect: () => qb,
        where: () => qb,
        andWhere: () => qb,
        orderBy: () => qb,
        setParameter: () => qb,
        update: () => qb,
        set: () => qb,
        execute: async () => ({ affected: 1 }),
        getRawMany: async () => (kind === 'tier' ? [{ tier: 1 }] : candidates),
    };
    return qb;
}

const providerCandidates = [
    {
        provider_score: 100,
        provider_id: 'p1',
        mp_model_name: 'gpt-4-provider',
        standard_model_name: 'gpt-4',
        provider_base_url: 'https://upstream.example.com',
        provider_api_key: 'provider-key',
        provider_protocol: 'openai',
    },
];

describe('LlmProxyService 重构回归测试', () => {
    let service: LlmProxyService;
    let originalFetch: typeof fetch;

    beforeEach(() => {
        service = new LlmProxyService();
        mockEntityManager.createQueryBuilder = vi.fn(() => createQbStub(providerCandidates)) as any;
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    describe('selectProviderWithLoadBalancing', () => {
        it('空候选返回 undefined', () => {
            expect(selectProviderWithLoadBalancing([])).toBeUndefined();
        });

        it('单个候选直接返回', () => {
            const c = { provider_score: 10, provider_id: 'a' };
            expect(selectProviderWithLoadBalancing([c])).toBe(c);
        });

        it('总分为 0 时随机选择', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const candidates = [
                { provider_score: 0, provider_id: 'a' },
                { provider_score: 0, provider_id: 'b' },
            ];
            expect(selectProviderWithLoadBalancing(candidates)?.provider_id).toBe('b');
        });

        it('按健康分加权选择', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const candidates = [
                { provider_score: 100, provider_id: 'light' },
                { provider_score: 300, provider_id: 'heavy' },
            ];
            expect(selectProviderWithLoadBalancing(candidates)?.provider_id).toBe('heavy');
        });
    });

    describe('isThinkingError', () => {
        it('识别 thinking 错误', () => {
            expect(isThinkingError('Expected `thinking` to be an object')).toBe(true);
            expect(isThinkingError('redacted_thinking is not allowed')).toBe(true);
            expect(isThinkingError('thinking block unavailable')).toBe(true);
            expect(isThinkingError('thinking: Field required')).toBe(true);
        });

        it('非 thinking 错误返回 false', () => {
            expect(isThinkingError('rate limit exceeded')).toBe(false);
            expect(isThinkingError('invalid api key')).toBe(false);
            expect(isThinkingError('')).toBe(false);
        });
    });

    describe('buildCodexResponseFromStream', () => {
        it('空 chunks 抛错', () => {
            expect(() => buildCodexResponseFromStream([])).toThrow('No stream chunks');
        });

        it('从流式事件重建完整响应', () => {
            const chunks = [
                { type: 'response.created', response_id: 'resp_1' },
                { type: 'response.output_text.delta', delta: 'Hello' },
                { type: 'response.output_text.delta', delta: ' World' },
                { type: 'response.completed', response_id: 'resp_1', token_usage: { input_tokens: 5, output_tokens: 2 } },
            ];
            const result = buildCodexResponseFromStream(chunks);
            expect(result.id).toBe('resp_1');
            expect(result.object).toBe('response');
            expect((result.output as any[])[0].content[0].text).toBe('Hello World');
            expect(result.usage).toEqual({ input_tokens: 5, output_tokens: 2 });
        });
    });

    describe('SSE 流', () => {
        async function collect(stream: ReadableStream<unknown>): Promise<unknown[]> {
            const reader = stream.getReader();
            const values: unknown[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                values.push(value);
            }
            return values;
        }

        it('行解析 + data 提取 + JSON 解析', async () => {
            const input = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"a":1}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    controller.close();
                },
            });
            const values = await collect(
                input
                    .pipeThrough(createSSELineStream())
                    .pipeThrough(createSSEDataStream())
                    .pipeThrough(createJSONParseStream())
            );
            expect(values).toEqual([{ a: 1 }, '[DONE]']);
        });
    });

    describe('normalizeProxyRequest', () => {
        it('修复 tool 消息序列并清理 $schema、标准化 thinking', () => {
            const body: any = {
                messages: [{ role: 'tool' }],
                tools: [{ function: { parameters: { $schema: 'x', properties: { a: { $schema: 'y' } } } } }],
                stream: false,
                extended_thinking: true,
            };
            const { forceStreamForCodex, originalStreamMode } = normalizeProxyRequest(body, true, 'openai');
            expect(body.messages).toHaveLength(2);
            expect(body.messages[1].role).toBe('user');
            expect(body.tools[0].function.parameters.$schema).toBeUndefined();
            expect(body.tools[0].function.parameters.properties.a.$schema).toBeUndefined();
            expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 10000 });
            expect(body.extended_thinking).toBeUndefined();
            expect(forceStreamForCodex).toBe(false);
            expect(originalStreamMode).toBe(false);
        });

        it('Codex 协议强制流式', () => {
            const body: any = { stream: false };
            const result = normalizeProxyRequest(body, false, 'codex');
            expect(result.forceStreamForCodex).toBe(true);
            expect(result.originalStreamMode).toBe(false);
            expect(body.stream).toBe(true);
        });
    });

    describe('extractTextContent', () => {
        it('提取 OpenAI 格式文本', () => {
            expect(extractTextContent({ choices: [{ message: { content: 'hi' } }] })).toBe('hi');
        });
        it('提取 Codex 格式文本', () => {
            expect(extractTextContent({ output: [{ content: [{ text: 'codex' }] }] })).toBe('codex');
        });
        it('提取 Claude 格式文本', () => {
            expect(extractTextContent({ content: [{ text: 'claude' }] })).toBe('claude');
        });
        it('无法识别返回空字符串', () => {
            expect(extractTextContent({ foo: 'bar' })).toBe('');
        });
    });

    describe('ProtocolConverter', () => {
        it('相同协议直接返回原请求', () => {
            const converter = new ProtocolConverter();
            const request = { model: 'gpt', messages: [] };
            expect(converter.convertRequest('openai', 'openai', request)).toBe(request);
        });

        it('openai → anthropic 转换请求', () => {
            const converter = new ProtocolConverter();
            const result = converter.convertRequest('openai', 'anthropic', {
                model: 'gpt',
                messages: [{ role: 'user', content: 'hi' }],
            });
            expect(result).not.toBeNull();
            expect((result as any).messages).toBeDefined();
        });

        it('不支持的协议返回 null', () => {
            const converter = new ProtocolConverter();
            expect(converter.convertRequest('openai', 'unknown', { model: 'gpt' })).toBeNull();
        });
    });

    describe('LlmProxyService.proxyRequest', () => {
        it('非流式成功路径返回转换后的响应', async () => {
            globalThis.fetch = vi.fn(async () => new Response(
                JSON.stringify({ choices: [{ message: { content: 'Hello' } }], usage: { input_tokens: 10, output_tokens: 5 } }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )) as any;

            const result = await service.proxyRequest(
                'openai',
                '/chat/completions',
                { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] },
                { 'content-type': 'application/json', authorization: 'Bearer client-token' },
                100
            );

            expect(result.success).toBe(true);
            const data = await result.response!.json();
            expect(data.choices[0].message.content).toBe('Hello');

            // 上游请求使用 provider 的 apiKey，而非客户端 token
            const fetchMock = globalThis.fetch as any as ReturnType<typeof vi.fn>;
            const init = fetchMock.mock.calls[0]?.[1] as { headers?: Record<string, string> } | undefined;
            expect(init?.headers?.Authorization).toBe('Bearer provider-key');
        });

        it('流式路径返回 SSE 输出', async () => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"id":"1","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hi"}}]}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    controller.close();
                },
            });
            globalThis.fetch = vi.fn(async () => new Response(stream, {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            })) as any;

            const result = await service.proxyRequest(
                'openai',
                '/chat/completions',
                { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }], stream: true },
                { 'content-type': 'application/json' },
                100
            );

            expect(result.success).toBe(true);
            const text = await result.response!.text();
            expect(text).toContain('"content":"Hi"');
            expect(text).toContain('data: [DONE]');
        });

        it('无可用 provider 时返回错误', async () => {
            mockEntityManager.createQueryBuilder = vi.fn(() => createQbStub([])) as any;
            const result = await service.proxyRequest(
                'openai',
                '/chat/completions',
                { model: 'nonexistent-model' },
                {},
                0
            );
            expect(result.success).toBe(false);
            expect(result.error).toContain('无可用 provider');
        });

        it('缺失 model 参数时返回错误', async () => {
            const result = await service.proxyRequest('openai', '/chat/completions', {} as any, {}, 0);
            expect(result.success).toBe(false);
            expect(result.error).toContain('model');
        });
    });
});
