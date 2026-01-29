import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatGPT_API, ChatGPT_API_async, ChatGPT_API_with_finish_reason } from '../../src/utils/openai.js';
import type { ChatMessage } from '../../src/types/openai.types.js';

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: class {
    apiKey: string;
    constructor(config: any) {
      this.apiKey = config.apiKey;
    }
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

describe('ChatGPT_API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 设置默认mock返回值
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Test response' } }],
    });
  });

  it('应该调用OpenAI API并返回响应', async () => {
    const response = await ChatGPT_API('gpt-4', 'Test prompt', 'test-api-key');
    expect(response).toBe('Test response');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('应该在失败时重试', async () => {
    // 前3次失败，第4次成功
    mockCreate
      .mockRejectedValueOnce(new Error('API Error 1'))
      .mockRejectedValueOnce(new Error('API Error 2'))
      .mockRejectedValueOnce(new Error('API Error 3'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Success after retries' } }],
      });

    const response = await ChatGPT_API('gpt-4', 'Test prompt', 'test-api-key');
    expect(response).toBe('Success after retries');
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it('应该在达到最大重试次数后抛出错误', async () => {
    mockCreate.mockRejectedValue(new Error('Persistent API Error'));

    await expect(
      ChatGPT_API('gpt-4', 'Test prompt', 'test-api-key')
    ).rejects.toThrow('Persistent API Error');
    expect(mockCreate).toHaveBeenCalledTimes(10);
  }, 15000); // 增加超时时间到15秒

  it('应该支持对话历史', async () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];

    await ChatGPT_API('gpt-4', 'How are you?', 'test-api-key', history);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      })
    );
  });

  it('应该使用默认API密钥', async () => {
    process.env.CHATGPT_API_KEY = 'default-api-key';

    await ChatGPT_API('gpt-4', 'Test prompt');

    expect(mockCreate).toHaveBeenCalled();
  });
});

describe('ChatGPT_API_async', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Async response' } }],
    });
  });

  it('应该异步调用API', async () => {
    const response = await ChatGPT_API_async('gpt-4', 'Test prompt', 'test-api-key');
    expect(response).toBe('Async response');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('ChatGPT_API_with_finish_reason', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该返回内容和完成原因', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: { content: 'Finished response' },
          finish_reason: 'stop',
        },
      ],
    });

    const [content, finishReason] = await ChatGPT_API_with_finish_reason(
      'gpt-4',
      'Test prompt',
      'test-api-key'
    );

    expect(content).toBe('Finished response');
    expect(finishReason).toBe('finished');
  });

  it('应该检测到max_output_reached', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: { content: 'Partial response' },
          finish_reason: 'length',
        },
      ],
    });

    const [content, finishReason] = await ChatGPT_API_with_finish_reason(
      'gpt-4',
      'Test prompt',
      'test-api-key'
    );

    expect(content).toBe('Partial response');
    expect(finishReason).toBe('max_output_reached');
  });

  it('应该在失败时重试', async () => {
    mockCreate
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValue({
        choices: [
          {
            message: { content: 'Success' },
            finish_reason: 'stop',
          },
        ],
      });

    const [content, finishReason] = await ChatGPT_API_with_finish_reason(
      'gpt-4',
      'Test prompt',
      'test-api-key'
    );

    expect(content).toBe('Success');
    expect(finishReason).toBe('finished');
    expect(mockCreate).toHaveBeenCalledTimes(2); // 第1次失败,第2次成功
  });
});
