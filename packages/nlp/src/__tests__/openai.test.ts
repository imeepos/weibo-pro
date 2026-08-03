import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { MockOpenAI } = vi.hoisted(() => ({
  MockOpenAI: vi.fn(),
}));

vi.mock('openai', () => ({
  default: MockOpenAI,
  OpenAI: MockOpenAI,
}));

beforeEach(() => {
  // 使用普通函数而非箭头函数：new OpenAI(...) 需要构造函数语义
  MockOpenAI.mockImplementation(function () {
    return { isMockOpenAI: true };
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  MockOpenAI.mockReset();
});

describe('getOpenAiConfig', () => {
  it('API_BASE_URL 未设置时返回默认 baseURL', async () => {
    vi.stubEnv('API_BASE_URL', '');
    vi.resetModules();
    const { getOpenAiConfig } = await import('../openai.js');
    const config = await getOpenAiConfig();
    expect(config).toEqual({
      baseURL: 'http://localhost:8089/api/auth/llm/openai',
      apiKey: 'xxx',
      timeout: 60000,
      maxRetries: 2,
    });
  });

  it('API_BASE_URL 设置后 baseURL 拼接为 `${API_BASE_URL}/api/auth/llm/openai`', async () => {
    vi.stubEnv('API_BASE_URL', 'http://llm-proxy.example.com');
    vi.resetModules();
    const { getOpenAiConfig } = await import('../openai.js');
    const config = await getOpenAiConfig();
    expect(config.baseURL).toBe(
      'http://llm-proxy.example.com/api/auth/llm/openai',
    );
    expect(config.apiKey).toBe('xxx');
    expect(config.timeout).toBe(60000);
    expect(config.maxRetries).toBe(2);
  });
});

describe('useOpenAi', () => {
  it('使用 getOpenAiConfig 的配置构造 OpenAI 实例', async () => {
    vi.stubEnv('API_BASE_URL', 'http://proxy.example.com');
    vi.resetModules();
    const { useOpenAi } = await import('../openai.js');
    const client = await useOpenAi();
    expect(MockOpenAI).toHaveBeenCalledTimes(1);
    expect(MockOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://proxy.example.com/api/auth/llm/openai',
        apiKey: 'xxx',
        timeout: 60000,
        maxRetries: 2,
      }),
    );
    expect(client).toEqual({ isMockOpenAI: true });
  });
});
