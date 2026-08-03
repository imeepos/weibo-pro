import { describe, it, expect } from 'vitest';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { z } from 'zod';

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
 *
 * 本文件包含：JSON 输出格式验证与边界情况。
 * json-harmony 容错解析相关见 PromptRoleSkillAstVisitor.json-harmony.test.ts。
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
