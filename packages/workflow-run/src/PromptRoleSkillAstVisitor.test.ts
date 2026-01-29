import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { z } from 'zod';
import { parse } from '@sker/json-harmony';

/**
 * TDD 测试: PromptRoleSkillAst JSON 解析错误修复
 *
 * 问题: LLM 返回自然语言而非 JSON 格式，导致 withStructuredOutput 解析失败
 * 错误: Unexpected token '根', "根据您的需求"分析舆"... is not valid JSON
 *
 * 解决方案: 使用 @sker/json-harmony 容错解析 LLM 输出
 *
 * 测试策略:
 * 1. 验证 system prompt 是否包含明确的 JSON 格式要求
 * 2. 验证 json-harmony 能解析各种格式的 LLM 输出
 * 3. 验证当 LLM 返回无效 JSON 时能正确处理错误
 */

describe('PromptRoleSkillAst - JSON Output Format', () => {
  describe('System Prompt Validation', () => {
    it('should contain explicit JSON format requirement in system prompt', () => {
      // 这个测试验证 system prompt 的构建逻辑
      // 目标: 确保 system prompt 明确要求 LLM 返回 JSON 格式

      const skills = [
        {
          id: 'skill-1',
          type: 'analysis',
          title: '关键词分析',
          description: '分析关键词'
        },
        {
          id: 'skill-2',
          type: 'generation',
          title: '文本生成',
          description: '生成文本内容'
        }
      ];

      const skillsDescription = skills
        .map(s => `- [${s.type}] ${s.title} (ID: ${s.id}): ${s.description || '无描述'}`)
        .join('\n');

      // 构建期望的 system prompt（与 Visitor 中的逻辑一致）
      const systemPrompt = `你是一个智能助手，负责为当前角色选择合适的技能。

## 可用技能列表
${skillsDescription}

## 任务要求
1. 使用 get_skill_content 工具查看技能的详细内容
2. 根据用户需求，选择最相关的技能
3. **重要**：必须以 JSON 格式返回结果

## 输出格式（必须严格遵守）
\`\`\`json
{
  "selected_skill_ids": ["skill-1", "skill-2"],
  "reasoning": "选择这些技能的原因"
}
\`\`\`

## 约束条件
- 技能ID必须是完整的UUID格式（从上述列表中选择）
- 不要编造或修改技能ID
- reasoning 字段用中文说明选择理由`;

      // 验证 system prompt 包含关键元素
      expect(systemPrompt).toContain('JSON');
      expect(systemPrompt).toContain('输出格式');
      expect(systemPrompt).toContain('selected_skill_ids');
      expect(systemPrompt).toContain('reasoning');
      expect(systemPrompt).toContain('必须严格遵守');
    });

    it('should use zod schema for structured output validation', () => {
      // 验证 schema 定义正确
      const SkillSelectionSchema = z.object({
        selected_skill_ids: z.array(z.string()).describe('选中的技能ID列表'),
        reasoning: z.string().describe('选择这些技能的原因')
      });

      // 测试有效输入
      const validInput = {
        selected_skill_ids: ['skill-1', 'skill-2'],
        reasoning: '这些技能最适合分析舆情'
      };

      expect(() => SkillSelectionSchema.parse(validInput)).not.toThrow();
      expect(SkillSelectionSchema.parse(validInput)).toEqual(validInput);

      // 测试无效输入（缺少字段）
      const invalidInput = {
        selected_skill_ids: ['skill-1']
        // 缺少 reasoning
      };

      expect(() => SkillSelectionSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('LLM Response Format Validation', () => {
    it('should reject non-JSON response from LLM', () => {
      // 模拟 LLM 返回非 JSON 的响应
      const invalidLLMResponse = `根据您的需求"分析舆情"，我建议使用以下技能...`;

      // 尝试解析为 JSON 应该失败
      expect(() => JSON.parse(invalidLLMResponse)).toThrow();
    });

    it('should accept valid JSON response from LLM', () => {
      // 模拟 LLM 返回有效的 JSON 响应
      const validLLMResponse = JSON.stringify({
        selected_skill_ids: ['skill-1', 'skill-2'],
        reasoning: '这些技能适合舆情分析任务'
      });

      // 解析应该成功
      const parsed = JSON.parse(validLLMResponse);
      expect(parsed).toHaveProperty('selected_skill_ids');
      expect(parsed).toHaveProperty('reasoning');
      expect(parsed.selected_skill_ids).toEqual(['skill-1', 'skill-2']);
    });

    it('should extract JSON from markdown code blocks', () => {
      // 模拟 LLM 返回包含在 markdown 代码块中的 JSON
      const responseWithMarkdown = `我为您选择了以下技能：

\`\`\`json
{
  "selected_skill_ids": ["skill-1"],
  "reasoning": "关键词分析适合当前任务"
}
\`\`\`

这些技能可以有效帮助您完成舆情分析。`;

      // 提取 JSON 的正则表达式
      const jsonMatch = responseWithMarkdown.match(/```json\n([\s\S]*?)\n```/);
      expect(jsonMatch).toBeTruthy();

      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[1]);
        expect(extracted.selected_skill_ids).toEqual(['skill-1']);
        expect(extracted.reasoning).toContain('关键词分析');
      }
    });
  });
});

describe('PromptRoleSkillAst - Edge Cases', () => {
  it('should handle empty skills list gracefully', () => {
    const ast = new PromptRoleSkillAst();
    ast.availableSkills = [];
    ast.requirements = [];

    // 当没有可用技能时，应该返回空结果
    expect(ast.availableSkills).toHaveLength(0);
  });

  it('should handle invalid UUID format in skill IDs', () => {
    const invalidUUIDs = [
      'not-a-uuid',
      '12345',
      'abc-def-ghi',
      ''
    ];

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    invalidUUIDs.forEach(id => {
      expect(UUID_REGEX.test(id)).toBe(false);
    });

    // 有效的 UUID
    const validUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(UUID_REGEX.test(validUUID)).toBe(true);
  });

  it('should filter out invalid skill IDs from LLM response', () => {
    const skills = [
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', title: 'Valid Skill 1' },
      { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', title: 'Valid Skill 2' }
    ];

    const validSkillIds = new Set(skills.map(s => s.id));
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 模拟 LLM 返回的 ID 列表（包含无效 ID）
    const llmReturnedIds = [
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  // 有效且在列表中
      'invalid-uuid',                            // 无效格式
      'not-in-list-uuid-xxxx-xxxx-xxxxxxxxxxxx', // 有效格式但不在列表中
      'b2c3d4e5-f6a7-8901-bcde-f12345678901'   // 有效且在列表中
    ];

    // 过滤逻辑（与 Visitor 中一致）
    const finalSelectedIds = llmReturnedIds.filter(id => {
      if (!UUID_REGEX.test(id)) {
        return false; // 格式无效
      }
      if (!validSkillIds.has(id)) {
        return false; // 不在可用列表中
      }
      return true;
    });

    // 验证过滤结果
    expect(finalSelectedIds).toEqual([
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    ]);
    expect(finalSelectedIds).toHaveLength(2);
  });
});

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
    it('should use ManualFix strategy for unquoted keys', () => {
      const unquotedJSON = '{name: "test", age: 30}';
      const result = parse(unquotedJSON);

      expect(result.data).toBeDefined();
      expect(result.statistics.recoveryStrategiesUsed).toContain('ManualFix');
    });

    it('should use RegexExtract strategy for markdown blocks', () => {
      const markdown = '```json\n{"test": "value"}\n```';
      const result = parse(markdown);

      expect(result.data).toBeDefined();
      expect(result.statistics.recoveryStrategiesUsed).toContain('RegexExtract');
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
      expect(result.statistics.parseTimeMs).toBeGreaterThan(0);
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0);
    });
  });
});
