import { Injectable } from '@sker/core';
import { ChapterData } from '@sker/workflow-ast';
import { useLlmModel } from '../llm-client';

/**
 * 章节质量评估结果
 */
export interface QualityCheckResult {
  score: number;           // 综合评分 0-100
  issues: QualityIssue[];  // 质量问题列表
  suggestions: string[];   // 改进建议
  passed: boolean;         // 是否通过质检
}

export interface QualityIssue {
  type: 'word_count' | 'repetition' | 'character_arc' | 'plot_progress' | 'consistency' | 'title_duplicate';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;       // 问题位置（如："第2段"）
}

/**
 * 章节质检服务
 * 职责：使用 LLM 评估章节质量，给出 0-100 分
 */
@Injectable({ providedIn: 'auto' })
export class ChapterQualityService {
  /**
   * 检查章节质量
   */
  async check(
    chapter: ChapterData,
    previousChapters: ChapterData[],
    targetWordCount: number,
    signal?: AbortSignal
  ): Promise<QualityCheckResult> {
    // 直接使用 LLM 给出总分
    const llmResult = await this.llmQualityCheck(chapter, previousChapters, targetWordCount, signal);

    console.log(`[ChapterQualityService] LLM 评分: ${llmResult.score}，问题数: ${llmResult.issues.length}`);

    return {
      score: llmResult.score,
      issues: llmResult.issues,
      suggestions: llmResult.suggestions,
      passed: llmResult.score >= 70
    };
  }

  /**
   * 使用 LLM 进行质量检查
   */
  private async llmQualityCheck(
    chapter: ChapterData,
    previousChapters: ChapterData[],
    targetWordCount: number,
    signal?: AbortSignal
  ): Promise<{ score: number; issues: QualityIssue[]; suggestions: string[] }> {
    const model = useLlmModel({ model: 'deepseek-ai/DeepSeek-V3.2', temperature: 0.3 });

    // 构建前文摘要
    const previousSummary = previousChapters.slice(-3).map(ch =>
      `第${ch.chapterNumber}章《${ch.title}》：${ch.summary}`
    ).join('\n');

    const actualWordCount = chapter.content.length;

    const systemPrompt = `你是专业小说编辑，给章节打分（0-100分）。

评分标准：
- 90-100分：优秀（人物有弧光、情节推进明显、世界观一致、字数合适）
- 80-89分：良好（大部分维度达标，有小问题）
- 70-79分：及格（基本达标，但有明显不足）
- 60-69分：不及格（需要重写）
- 60分以下：差（严重问题）

输出 JSON 格式：
{
  "score": 85,
  "issues": [
    { "type": "word_count", "severity": "medium", "description": "字数偏少" }
  ],
  "suggestions": [
    "增加人物内心戏描写",
    "推进情节到下一个转折点"
  ]
}`;

    const userPrompt = `**目标字数**：${targetWordCount}字
**实际字数**：${actualWordCount}字

**前文摘要**：
${previousSummary || '（第一章，无前文）'}

**本章内容**：
标题：${chapter.title}
简介：${chapter.summary}
正文：
${chapter.content}

请评分。`;

    try {
      const result = await model.invoke(
        [
          { role: 'system', content: systemPrompt },
          { role: 'human', content: userPrompt }
        ],
        { signal }
      );

      const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch?.[0]) {
        console.warn('[ChapterQualityService] LLM 返回格式不正确，使用默认评分');
        return { score: 70, issues: [], suggestions: ['LLM 返回格式错误'] };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // 修复常见 JSON 格式问题
        const fixed = jsonMatch[0]
          .replace(/'([^']+)'(\s*:)/g, '"$1"$2')
          .replace(/:\s*'([^']*)'/g, ': "$1"');
        parsed = JSON.parse(fixed);
      }

      console.log(`[ChapterQualityService] LLM 原始评分: ${parsed.score}`);

      return {
        score: parsed.score || 70,
        issues: (parsed.issues || []).map((issue: any) => ({
          type: issue.type || 'plot_progress',
          severity: issue.severity || 'medium',
          description: issue.description || '',
          location: issue.location
        })),
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      console.error('[ChapterQualityService] LLM 质检失败：', error);
      return { score: 70, issues: [], suggestions: ['质检失败'] };
    }
  }
}
