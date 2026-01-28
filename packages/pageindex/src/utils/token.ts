import { encode } from 'gpt-tokenizer';

/**
 * 计算文本的token数量
 * @param text - 要计算的文本
 * @param model - 模型名称,默认 'gpt-4o-2024-11-20'
 * @returns token数量
 */
export function countTokens(text: string, model: string = 'gpt-4o-2024-11-20'): number {
  if (!text) return 0;

  try {
    // gpt-tokenizer 的第二个参数可以是字符串(模型名)或选项对象
    const tokens = encode(text, model as never);
    return tokens.length;
  } catch {
    // Fallback to simple estimation
    return Math.ceil(text.length / 4);
  }
}
