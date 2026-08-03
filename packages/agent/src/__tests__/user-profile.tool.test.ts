import { describe, it, expect, vi } from 'vitest';

// Mock tool wiring + data layer — only inspect the tool definitions,
// never execute a real query.
vi.mock('@langchain/core/tools', () => ({
  tool: vi.fn((fn: unknown, config: Record<string, unknown>) => ({
    ...config,
    invoke: fn,
  })),
}));

vi.mock('@sker/entities', () => ({
  WeiboPostEntity: class {},
  PostNLPResultEntity: class {},
  EventEntity: class {},
  EventHourlyStatisticsEntity: class {},
  useEntityManager: vi.fn(),
}));

vi.mock('@sker/nlp', () => ({
  NLPAnalyzer: class {},
}));

import { z } from 'zod';
import {
  createAnalyzeUserBehaviorTool,
  createDetectAbnormalUserTool,
} from '../tools';

describe('user-profile tool definitions', () => {
  it('createAnalyzeUserBehaviorTool() defines a valid analyze_user_behavior tool', () => {
    const toolDef = createAnalyzeUserBehaviorTool();

    expect(toolDef.name).toBe('analyze_user_behavior');
    expect(typeof toolDef.description).toBe('string');
    expect(toolDef.description.length).toBeGreaterThan(10);
    expect(toolDef.schema).toBeInstanceOf(z.ZodObject);
    expect(typeof toolDef.invoke).toBe('function');
  });

  it('analyze_user_behavior schema requires userId and applies limit default', () => {
    const toolDef = createAnalyzeUserBehaviorTool();
    const parsed = (toolDef.schema as z.ZodObject<any>).safeParse({
      userId: '123',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(200);
    }
  });

  it('createDetectAbnormalUserTool() defines a valid detect_abnormal_user tool', () => {
    const toolDef = createDetectAbnormalUserTool();

    expect(toolDef.name).toBe('detect_abnormal_user');
    expect(typeof toolDef.description).toBe('string');
    expect(toolDef.description.length).toBeGreaterThan(10);
    expect(toolDef.schema).toBeInstanceOf(z.ZodObject);
    expect(typeof toolDef.invoke).toBe('function');
  });

  it('detect_abnormal_user schema applies defaults and rejects invalid sensitivity', () => {
    const toolDef = createDetectAbnormalUserTool();
    const parsed = (toolDef.schema as z.ZodObject<any>).safeParse({
      userId: '123',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(200);
      expect(parsed.data.sensitivity).toBe('medium');
    }

    const invalid = (toolDef.schema as z.ZodObject<any>).safeParse({
      userId: '123',
      sensitivity: 'bogus',
    });
    expect(invalid.success).toBe(false);
  });
});
