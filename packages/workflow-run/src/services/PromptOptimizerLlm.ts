/**
 * 提示词优化器 LLM 交互层
 *
 * 从 PromptOptimizerAstVisitor.ts 抽取的 LLM 调用逻辑：
 * - generatePrompt：生成或根据评估反馈优化提示词
 * - testPrompt：使用提示词测试 AI 输出
 * - evaluateOutputs：评估测试输出与目标的匹配度
 *
 * 由 PromptOptimizerExecutor 创建并调用。
 */
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { EvaluationDimension } from '@sker/workflow-ast';
import { useLlmModel } from '../llm-client';

/** 生成/优化提示词的系统提示 */
const GENERATOR_SYSTEM_PROMPT = `你是一位提示词优化专家，精通 AI 提示工程。

你的任务是根据目标输出，生成或优化能够产生该输出的提示词。

## 工作原则
1. **逆向思维**：从输出推导输入，思考什么样的提示词能产生这样的输出
2. **精准表达**：提示词要清晰、具体、无歧义
3. **结构化设计**：使用 Markdown 格式，层次分明
4. **关注细节**：捕捉目标输出中的格式、语气、专业术语等特征

## 输出格式
返回 JSON:
{
  "prompt": "优化后的提示词",
  "rationale": "优化思路说明（为什么这样设计提示词）"
}`;

/** 评估结果的系统提示 */
const EVALUATOR_SYSTEM_PROMPT = `你是一位提示词效果评估专家。

你的任务是对比"目标输出"和"实际输出"，评估它们的匹配程度。

## 评估维度
你需要对以下维度进行评分（0-100 分）：
{{DIMENSIONS}}

## 评估原则
1. **客观公正**：基于事实评分，不带偏见
2. **具体反馈**：指出具体的匹配点和差异点
3. **可操作建议**：提供明确的改进方向

## 输出格式
返回 JSON:
{
  "dimensionScores": {
    "维度1": 分数,
    "维度2": 分数
  },
  "feedback": "整体评估反馈",
  "suggestions": "具体改进建议"
}`;

/** 评估结果结构 */
export interface EvaluationResult {
  dimensionScores: Record<string, number>;
  totalScore: number;
  feedback: string;
  suggestions: string;
}

export class PromptOptimizerLlm {
  /**
   * 生成或优化提示词
   */
  async generatePrompt(
    targetOutput: string,
    targetContext: string,
    previousEvaluation: {
      currentPrompt: string;
      feedback: string;
      suggestions: string;
      dimensionScores: Record<string, number>;
    } | null,
    model: string,
    temperature: number,
    _signal: AbortSignal
  ): Promise<{ prompt: string; rationale: string }> {
    const llm = useLlmModel({ model, temperature });

    let userMessage = `## 目标输出
${targetOutput}

## 上下文说明
${targetContext || '无额外上下文'}
`;

    if (previousEvaluation) {
      userMessage += `
## 当前提示词
${previousEvaluation.currentPrompt}

## 评估反馈
${previousEvaluation.feedback}

## 各维度得分
${JSON.stringify(previousEvaluation.dimensionScores, null, 2)}

## 改进建议
${previousEvaluation.suggestions}

请基于以上反馈，优化提示词以提高匹配度。`;
    } else {
      userMessage += `
请分析目标输出的特征，生成一个能够产生类似输出的提示词。`;
    }

    const result = await llm.invoke([
      { role: 'system', content: GENERATOR_SYSTEM_PROMPT },
      { role: 'human', content: userMessage },
    ]);

    const content = result.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parseResult = parseWithHarmony(jsonMatch[0]);
      if (parseResult.data && typeof parseResult.data === 'object') {
        const data = parseResult.data as { prompt?: string; rationale?: string };
        return {
          prompt: data.prompt || content,
          rationale: data.rationale || '',
        };
      }
    }

    // 如果解析失败，返回原始内容作为提示词
    return {
      prompt: content,
      rationale: '无法解析 JSON，使用原始输出',
    };
  }

  /**
   * 使用提示词测试 AI 输出
   */
  async testPrompt(
    prompt: string,
    model: string,
    temperature: number,
    _signal: AbortSignal
  ): Promise<string> {
    const llm = useLlmModel({ model, temperature });

    const result = await llm.invoke([
      { role: 'system', content: prompt },
      { role: 'human', content: '请按照你的角色设定执行任务。' },
    ]);

    return result.content as string;
  }

  /**
   * 评估测试输出与目标的匹配度
   */
  async evaluateOutputs(
    targetOutput: string,
    testOutputs: string[],
    dimensions: EvaluationDimension[],
    model: string,
    temperature: number,
    _signal: AbortSignal
  ): Promise<EvaluationResult> {
    const llm = useLlmModel({ model, temperature });

    // 构建维度说明
    const dimensionsText = dimensions
      .map((d) => `- **${d.name}**（权重 ${(d.weight * 100).toFixed(0)}%）：${d.description}`)
      .join('\n');

    const systemPrompt = EVALUATOR_SYSTEM_PROMPT.replace('{{DIMENSIONS}}', dimensionsText);

    const userMessage = `## 目标输出
${targetOutput}

## 实际测试输出（${testOutputs.length} 次）
${testOutputs.map((o, i) => `### 测试 ${i + 1}\n${o}`).join('\n\n')}

请评估实际输出与目标的匹配程度。`;

    const result = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'human', content: userMessage },
    ]);

    const content = result.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parseResult = parseWithHarmony(jsonMatch[0]);
      if (parseResult.data && typeof parseResult.data === 'object') {
        const data = parseResult.data as {
          dimensionScores?: Record<string, number>;
          feedback?: string;
          suggestions?: string;
        };

        const dimensionScores = data.dimensionScores || {};

        // 计算加权总分
        let totalScore = 0;
        let totalWeight = 0;
        for (const dim of dimensions) {
          const score = dimensionScores[dim.name] || 0;
          totalScore += score * dim.weight;
          totalWeight += dim.weight;
        }
        if (totalWeight > 0) {
          totalScore = totalScore / totalWeight;
        }

        return {
          dimensionScores,
          totalScore,
          feedback: data.feedback || '',
          suggestions: data.suggestions || '',
        };
      }
    }

    // 解析失败，返回默认值
    return {
      dimensionScores: {},
      totalScore: 0,
      feedback: '评估解析失败',
      suggestions: '请检查评估模型输出格式',
    };
  }
}
