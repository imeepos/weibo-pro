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
import { createQueryPostsTool, createQueryEventsTool } from '../tools';
import { createNLPAnalyzeTool } from '../tools';

describe('business tool definitions', () => {
  it('createQueryPostsTool() defines a valid query_posts tool', () => {
    const toolDef = createQueryPostsTool();

    expect(toolDef.name).toBe('query_posts');
    expect(typeof toolDef.description).toBe('string');
    expect(toolDef.description.length).toBeGreaterThan(10);
    expect(toolDef.schema).toBeInstanceOf(z.ZodObject);
    expect(typeof toolDef.invoke).toBe('function');
  });

  it('query_posts schema accepts empty input and applies defaults', () => {
    const toolDef = createQueryPostsTool();
    const parsed = (toolDef.schema as z.ZodObject<any>).safeParse({});

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.orderBy).toBe('time_desc');
      expect(parsed.data.limit).toBe(100);
    }
  });

  it('query_posts schema rejects invalid orderBy values', () => {
    const toolDef = createQueryPostsTool();
    const parsed = (toolDef.schema as z.ZodObject<any>).safeParse({
      orderBy: 'bogus_order',
    });

    expect(parsed.success).toBe(false);
  });

  it('createQueryEventsTool() defines a valid query_events tool', () => {
    const toolDef = createQueryEventsTool();

    expect(toolDef.name).toBe('query_events');
    expect(typeof toolDef.description).toBe('string');
    expect(toolDef.schema).toBeInstanceOf(z.ZodObject);
    expect(typeof toolDef.invoke).toBe('function');
  });

  it('createNLPAnalyzeTool() names the tool nlp_analyze', () => {
    const analyzer = { analyze: vi.fn() };
    const toolDef = createNLPAnalyzeTool(analyzer as any);

    expect(toolDef.name).toBe('nlp_analyze');
    expect(toolDef.schema).toBeInstanceOf(z.ZodObject);
    // the schema requires a posts JSON string
    const parsed = (toolDef.schema as z.ZodObject<any>).safeParse({ posts: '[]' });
    expect(parsed.success).toBe(true);
  });
});
