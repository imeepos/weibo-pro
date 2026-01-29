import { describe, it, expect } from 'vitest';
import { countTokens } from '../../src/utils/token.js';

describe('countTokens', () => {
  it('应该返回0对于空文本', () => {
    expect(countTokens('')).toBe(0);
  });

  it('应该正确计算英文token数', () => {
    const text = 'Hello, world!';
    const tokens = countTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it('应该正确计算中文token数', () => {
    const text = '你好,世界!';
    const tokens = countTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });

  it('应该支持不同的模型', () => {
    const text = 'Test text';
    const gpt4Tokens = countTokens(text, 'gpt-4');
    const gpt35Tokens = countTokens(text, 'gpt-3.5-turbo');
    expect(gpt4Tokens).toBe(gpt35Tokens);
  });

  it('应该处理长文本', () => {
    const text = 'A'.repeat(1000);
    const tokens = countTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });
});
