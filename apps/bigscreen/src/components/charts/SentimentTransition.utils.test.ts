import { describe, it, expect } from 'vitest';
import { formatNumber, formatTime, formatShortTime } from './SentimentTransition.utils';

describe('SentimentTransition 格式化工具', () => {
  it('formatNumber 添加千分位分隔符', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formatNumber 对较小的数字不添加分隔符', () => {
    expect(formatNumber(85)).toBe('85');
  });

  it('formatTime 格式化完整时间（含年份）', () => {
    const result = formatTime('2024-01-01T10:00:00Z');
    expect(result).toContain('2024');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('formatTime 接受 Date 对象', () => {
    const result = formatTime(new Date('2024-01-01T10:00:00Z'));
    expect(result).toContain('2024');
  });

  it('formatShortTime 格式化短时间（不含年份）', () => {
    const result = formatShortTime('2024-01-01T10:00:00Z');
    expect(result).toBeTypeOf('string');
    expect(result).toMatch(/\d/);
    expect(result).not.toContain('2024');
  });
});
