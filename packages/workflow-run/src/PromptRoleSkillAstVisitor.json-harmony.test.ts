import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parse } from '@sker/json-harmony';

/**
 * TDD 测试: PromptRoleSkillAst json-harmony 容错解析
 *
 * 从 PromptRoleSkillAstVisitor.test.ts 按主题拆分的测试组：
 * - 容错解析 LLM 输出：有效 JSON / Markdown 代码块 / 无引号键 / 尾随逗号 / 自然语言混合 / 完全无效
 * - Schema Validation：json-harmony 解析后使用 zod 验证结构
 * - Recovery Strategies：解析统计信息
 */

describe('PromptRoleSkillAst - JsonHarmony Integration', () => {
  describe('容错解析 LLM 输出', () => {
    it('should parse valid JSON response', () => {
      // 标准的 JSON 响应
      const validJSON = JSON.stringify({
        selected_skill_ids: ['skill-1', 'skill-2'],
        reasoning: '这些技能适合舆情分析任务'
      });

      const result = parse(validJSON);

      expect(result.data).toHaveProperty('selected_skill_ids');
      expect(result.data).toHaveProperty('reasoning');
      expect(result.data.selected_skill_ids).toEqual(['skill-1', 'skill-2']);
    });

    it('should parse JSON from markdown code block', () => {
      // LLM 返回的 Markdown 格式
      const markdownResponse = `根据您的需求，我选择了以下技能：

\`\`\`json
{
  "selected_skill_ids": ["skill-1", "skill-2"],
  "reasoning": "这些技能适合舆情分析任务"
}
\`\`\`

希望这些技能对您有帮助！`;

      const result = parse(markdownResponse);

      expect(result.data).toHaveProperty('selected_skill_ids');
      expect(result.data.selected_skill_ids).toEqual(['skill-1', 'skill-2']);
      expect(result.data.reasoning).toContain('舆情分析');
    });

    it('should parse JSON with unquoted keys', () => {
      // LLM 可能返回无引号的键
      const unquotedKeys = `{
  selected_skill_ids: ["skill-1"],
  reasoning: "关键词分析适合当前任务"
}`;

      const result = parse(unquotedKeys);

      expect(result.data).toHaveProperty('selected_skill_ids');
      expect(result.data.selected_skill_ids).toEqual(['skill-1']);
    });

    it('should parse JSON with trailing commas', () => {
      // LLM 可能返回带尾随逗号的 JSON
      const trailingCommas = `{
  "selected_skill_ids": ["skill-1"],
  "reasoning": "测试",
}`;

      const result = parse(trailingCommas);

      expect(result.data.selected_skill_ids).toEqual(['skill-1']);
    });

    it('should parse mixed natural language and JSON', () => {
      // 这是最初的错误场景：自然语言 + JSON 混合
      const mixedContent = `根据您的需求"分析舆情"，我为您选择了以下技能：

\`\`\`json
{
  "selected_skill_ids": ["skill-1"],
  "reasoning": "关键词分析适合舆情分析任务"
}
\`\`\`

这些技能可以有效帮助您完成舆情分析工作。`;

      const result = parse(mixedContent);

      expect(result.data).toHaveProperty('selected_skill_ids');
      expect(result.data.selected_skill_ids).toEqual(['skill-1']);
      expect(result.data.reasoning).toContain('关键词分析');
    });

    it('should handle completely invalid JSON gracefully', () => {
      // 完全不是 JSON 的文本
      const invalidJSON = `这是一段完全没有任何 JSON 格式的文本。
它只是普通的中文回复。`;

      const result = parse(invalidJSON);

      // json-harmony 会尽力解析，但可能会保留原始文本
      expect(result).toBeDefined();
      // 如果解析失败，data 可能是原始字符串或部分解析结果
    });
  });

  describe('Schema Validation with JsonHarmony', () => {
    const SkillSelectionSchema = z.object({
      selected_skill_ids: z.array(z.string()).describe('选中的技能ID列表'),
      reasoning: z.string().describe('选择这些技能的原因')
    });

    it('should validate parsed JSON against zod schema', () => {
      // LLM 返回的 Markdown + JSON
      const llmResponse = `我选择了以下技能：

\`\`\`json
{
  "selected_skill_ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  "reasoning": "这是最适合的技能"
}
\`\`\``;

      // 使用 json-harmony 解析
      const parsed = parse(llmResponse);
      expect(parsed.data).toBeDefined();

      // 使用 zod 验证
      const validated = SkillSelectionSchema.safeParse(parsed.data);
      expect(validated.success).toBe(true);

      if (validated.success) {
        expect(validated.data.selected_skill_ids).toHaveLength(1);
        expect(validated.data.reasoning).toContain('最适合');
      }
    });

    it('should reject invalid structure after parsing', () => {
      // 即使 json-harmony 能解析，zod 也应该验证结构
      const invalidStructure = `{
  "selected_skill_ids": ["skill-1"]
  // 缺少 reasoning 字段
}`;

      const parsed = parse(invalidStructure);
      const validated = SkillSelectionSchema.safeParse(parsed.data);

      // zod 验证应该失败，因为缺少 reasoning 字段
      expect(validated.success).toBe(false);
    });
  });

  describe('Recovery Strategies', () => {
    it('should parse unquoted keys and report parsing statistics', () => {
      const unquotedJSON = '{name: "test", age: 30}';
      const result = parse(unquotedJSON);

      expect(result.data).toEqual({ name: 'test', age: 30 });
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0);
    });

    it('should parse markdown code blocks and report parsing statistics', () => {
      const markdown = '```json\n{"test": "value"}\n```';
      const result = parse(markdown);

      expect(result.data).toEqual({ test: 'value' });
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0);
    });

    it('should provide statistics about parsing', () => {
      const complexJSON = `根据您的需求，这是结果：

\`\`\`json
{
  selected_skill_ids: ["skill-1"],
  reasoning: "测试"
}
\`\`\``;

      const result = parse(complexJSON);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.parseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0);
    });
  });
});
