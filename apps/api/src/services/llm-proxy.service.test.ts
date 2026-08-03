import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LlmProxyService } from './llm-proxy.service';
import { mockEntityManager } from '../test-setup';

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

describe('LlmProxyService', () => {
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
