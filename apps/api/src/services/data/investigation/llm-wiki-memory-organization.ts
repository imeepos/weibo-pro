export const LLM_WIKI_SECTIONS = ['identity', 'behavior', 'content', 'risk', 'relations'] as const;
export type LlmWikiSection = (typeof LLM_WIKI_SECTIONS)[number];

export const LLM_WIKI_STABILITIES = ['stable', 'tentative', 'conflicted'] as const;
export type LlmWikiStability = (typeof LLM_WIKI_STABILITIES)[number];

export const LLM_WIKI_SECTION_HUB_NAMES: Record<LlmWikiSection, string> = {
  identity: '身份画像',
  behavior: '行为模式',
  content: '内容倾向',
  risk: '风险研判',
  relations: '关系线索',
};

export function isLlmWikiSection(value: unknown): value is LlmWikiSection {
  return typeof value === 'string' && (LLM_WIKI_SECTIONS as readonly string[]).includes(value);
}

export function normalizeLlmWikiStability(value: unknown): LlmWikiStability {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if ((LLM_WIKI_STABILITIES as readonly string[]).includes(normalized)) {
      return normalized as LlmWikiStability;
    }
    if (normalized.includes('conflict') || normalized.includes('冲突')) {
      return 'conflicted';
    }
    if (normalized.includes('tentative') || normalized.includes('暂定') || normalized.includes('待复核')) {
      return 'tentative';
    }
  }

  return 'stable';
}

export function isLlmWikiSectionHubName(name: string): boolean {
  return Object.values(LLM_WIKI_SECTION_HUB_NAMES).includes(name);
}

export function inferMemorySection(input: {
  type: string;
  name: string;
  content: string;
}): LlmWikiSection {
  if (input.type === 'person') return 'relations';
  if (input.type === 'event') return 'behavior';
  if (/风险|协同|放大|极化/.test(`${input.name} ${input.content}`)) return 'risk';
  if (/主题|叙事|内容|情绪/.test(`${input.name} ${input.content}`)) return 'content';
  if (/活跃|节奏|行为|转发|发帖/.test(`${input.name} ${input.content}`)) return 'behavior';
  if (/关系|连接|圈层|互动/.test(`${input.name} ${input.content}`)) return 'relations';
  return 'identity';
}
