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
 *
 * 职责：
 * - 评估章节质量（字数、重复度、人物弧光、情节推进、世界观一致性）
 * - 生成详细的质量报告和改进建议
 * - 为重写提供具体的约束条件
 */
@Injectable({ providedIn: 'auto' })
export class ChapterQualityService {
  /**
   * 检查章节质量
   *
   * @param chapter - 当前章节
   * @param previousChapters - 前文章节
   * @param targetWordCount - 目标字数
   * @returns 质量评估结果
   */
  async check(
    chapter: ChapterData,
    previousChapters: ChapterData[],
    targetWordCount: number,
    signal?: AbortSignal
  ): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];
    let score = 100;

    // 1. 字数检查（权重：30分）
    const wordCountIssue = this.checkWordCount(chapter.content, targetWordCount);
    if (wordCountIssue) {
      issues.push(wordCountIssue);
      score -= 30 * (wordCountIssue.severity === 'high' ? 1 : wordCountIssue.severity === 'medium' ? 0.6 : 0.3);
    }

    // 2. 重复度检查（权重：20分）
    const repetitionIssues = this.checkRepetition(chapter, previousChapters);
    if (repetitionIssues.length > 0) {
      issues.push(...repetitionIssues);
      score -= 20 * Math.min(repetitionIssues.length / 3, 1); // 最多扣20分
    }

    // 3. 标题唯一性检查（权重：10分）
    const titleIssue = this.checkTitleUniqueness(chapter.title, previousChapters);
    if (titleIssue) {
      issues.push(titleIssue);
      score -= 10;
    }

    // 4. 使用 LLM 进行深度质检（权重：40分）
    const llmResult = await this.llmQualityCheck(chapter, previousChapters, signal);
    issues.push(...llmResult.issues);
    score -= (100 - llmResult.score) * 0.4; // 转换为40分制

    // 归一化分数
    score = Math.max(0, Math.min(100, Math.round(score)));

    // 生成改进建议
    const suggestions = this.generateSuggestions(issues, chapter, targetWordCount);

    return {
      score,
      issues,
      suggestions,
      passed: score >= 70 // 默认及格线
    };
  }

  /**
   * 字数检查
   */
  private checkWordCount(content: string, targetWordCount: number): QualityIssue | null {
    const actualWordCount = content.length;
    const deviation = Math.abs(actualWordCount - targetWordCount) / targetWordCount;

    if (deviation > 0.2) {
      return {
        type: 'word_count',
        severity: 'high',
        description: `字数严重偏离目标：实际${actualWordCount}字，目标${targetWordCount}字（偏差${(deviation * 100).toFixed(1)}%）`
      };
    } else if (deviation > 0.1) {
      return {
        type: 'word_count',
        severity: 'medium',
        description: `字数偏离目标：实际${actualWordCount}字，目标${targetWordCount}字（偏差${(deviation * 100).toFixed(1)}%）`
      };
    }

    return null;
  }

  /**
   * 重复度检查（规则式）
   */
  private checkRepetition(chapter: ChapterData, previousChapters: ChapterData[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // 提取特征短语（5-15字的片段）
    const extractPhrases = (text: string): string[] => {
      const phrases: string[] = [];
      const sentences = text.split(/[。！？\n]/);
      for (const sentence of sentences) {
        if (sentence.length >= 5 && sentence.length <= 30) {
          phrases.push(sentence.trim());
        }
      }
      return phrases;
    };

    const currentPhrases = extractPhrases(chapter.content);
    const recentChapters = previousChapters.slice(-2); // 只检查最近2章

    for (const prevChapter of recentChapters) {
      const prevPhrases = extractPhrases(prevChapter.content);

      // 计算相似短语数量
      let matchCount = 0;
      for (const phrase of currentPhrases) {
        if (prevPhrases.some(p => p === phrase || this.similarity(p, phrase) > 0.8)) {
          matchCount++;
        }
      }

      const repetitionRate = matchCount / currentPhrases.length;

      if (repetitionRate > 0.3) {
        issues.push({
          type: 'repetition',
          severity: 'high',
          description: `与第${prevChapter.chapterNumber}章有${(repetitionRate * 100).toFixed(1)}%的重复内容`,
          location: `对比章节${prevChapter.chapterNumber}`
        });
      } else if (repetitionRate > 0.15) {
        issues.push({
          type: 'repetition',
          severity: 'medium',
          description: `与第${prevChapter.chapterNumber}章有${(repetitionRate * 100).toFixed(1)}%的相似内容`,
          location: `对比章节${prevChapter.chapterNumber}`
        });
      }
    }

    return issues;
  }

  /**
   * 标题唯一性检查
   */
  private checkTitleUniqueness(title: string, previousChapters: ChapterData[]): QualityIssue | null {
    const normalizedTitle = title.replace(/^第.+?章[：:\s]*/g, '').replace(/\s+/g, '').toLowerCase();

    for (const chapter of previousChapters) {
      const prevTitle = chapter.title.replace(/^第.+?章[：:\s]*/g, '').replace(/\s+/g, '').toLowerCase();
      if (normalizedTitle === prevTitle || this.similarity(normalizedTitle, prevTitle) > 0.7) {
        return {
          type: 'title_duplicate',
          severity: 'high',
          description: `标题与第${chapter.chapterNumber}章重复或高度相似："${chapter.title}"`
        };
      }
    }

    return null;
  }

  /**
   * 使用 LLM 进行深度质检
   * 检查：人物弧光、情节推进、世界观一致性
   */
  private async llmQualityCheck(
    chapter: ChapterData,
    previousChapters: ChapterData[],
    signal?: AbortSignal
  ): Promise<{ score: number; issues: QualityIssue[] }> {
    const model = useLlmModel({ model: 'deepseek-ai/DeepSeek-V3.2', temperature: 0.3 });

    // 构建前文摘要（避免提示词过长）
    const previousSummary = previousChapters.slice(-3).map(ch =>
      `第${ch.chapterNumber}章《${ch.title}》：${ch.summary}`
    ).join('\n');

    const systemPrompt = `你是一位专业的小说编辑，负责评估章节质量。

请从以下维度评估本章节：

1. **人物弧光**（30分）：
   - 人物是否有情感/认知/行为变化？
   - 是否避免了"反应机器"（只有震惊/吐槽的循环）？
   - 人物动作和对话是否符合性格设定？

2. **情节推进**（40分）：
   - 本章是否有实质性的情节进展？
   - 是否揭示新信息、引入新冲突、改变现状、或埋下伏笔？
   - 是否避免了原地踏步或重复前文？

3. **世界观一致性**（30分）：
   - 科技水平、能力边界是否与前文一致？
   - 新设定是否与旧设定冲突？
   - 人物行为是否违反已建立的规则？

输出格式（JSON）：
{
  "score": 85,  // 0-100综合评分
  "character_arc": { "score": 25, "comment": "人物有明显的情感转变..." },
  "plot_progress": { "score": 35, "comment": "情节推进较好..." },
  "consistency": { "score": 25, "comment": "世界观保持一致..." },
  "issues": [
    { "type": "character_arc", "severity": "medium", "description": "主角缺乏主动行动" },
    { "type": "plot_progress", "severity": "low", "description": "本章信息密度略低" }
  ]
}`;

    const userPrompt = `**前文章节摘要**：
${previousSummary || '（第一章，无前文）'}

**本章内容**：
标题：${chapter.title}
简介：${chapter.summary}
正文（前800字）：
${chapter.content.substring(0, 800)}${chapter.content.length > 800 ? '...' : ''}

请评估本章质量。`;

    try {
      const result = await model.invoke(
        [
          { role: 'system', content: systemPrompt },
          { role: 'human', content: userPrompt }
        ],
        { signal }
      );

      const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

      // 尝试解析 JSON（多重容错策略）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        console.warn('[ChapterQualityService] LLM 返回格式不正确，使用默认评分');
        return { score: 70, issues: [] };
      }

      let parsed: any;
      try {
        // 尝试直接解析
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // JSON 解析失败，尝试修复常见问题
        console.warn('[ChapterQualityService] JSON 解析失败，尝试修复格式:', parseError instanceof Error ? parseError.message : parseError);

        try {
          // 修复策略1: 将单引号替换为双引号（但保留字符串内部的单引号）
          let fixedJson = jsonMatch[0]
            // 替换属性名的单引号为双引号 'key': -> "key":
            .replace(/'([^']+)'(\s*:)/g, '"$1"$2')
            // 替换值的单引号为双引号 : 'value' -> : "value"
            .replace(/:\s*'([^']*)'/g, ': "$1"');

          parsed = JSON.parse(fixedJson);
          console.log('[ChapterQualityService] JSON 修复成功');
        } catch (fixError) {
          // 修复失败，使用默认评分
          console.error('[ChapterQualityService] JSON 修复失败:', fixError instanceof Error ? fixError.message : fixError);
          console.error('[ChapterQualityService] 原始内容:', jsonMatch[0].substring(0, 200));
          return { score: 70, issues: [] };
        }
      }

      // 转换 issues 格式
      const issues: QualityIssue[] = (parsed.issues || []).map((issue: any) => ({
        type: issue.type || 'plot_progress',
        severity: issue.severity || 'medium',
        description: issue.description,
        location: issue.location
      }));

      return {
        score: parsed.score || 70,
        issues
      };
    } catch (error) {
      console.error('[ChapterQualityService] LLM 质检失败：', error);
      // 失败时给予中等分数，避免误杀
      return { score: 70, issues: [] };
    }
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(
    issues: QualityIssue[],
    chapter: ChapterData,
    targetWordCount: number
  ): string[] {
    const suggestions: string[] = [];

    // 按问题类型分组
    const issuesByType = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type]!.push(issue);
      return acc;
    }, {} as Record<string, QualityIssue[]>);

    // 字数问题
    if (issuesByType.word_count) {
      const actualWordCount = chapter.content.length;
      if (actualWordCount < targetWordCount * 0.9) {
        suggestions.push('扩充内容：增加环境细节描写（+25%）、深化内心戏（+35%）、构建对话张力（+20%）');
      } else if (actualWordCount > targetWordCount * 1.1) {
        suggestions.push('精简内容：删除冗余描写、合并相似场景、去除无效对话');
      }
    }

    // 重复问题
    if (issuesByType.repetition) {
      suggestions.push('避免重复：复用前文元素时必须有新的变化（深化/反转/后果/对比）');
      suggestions.push('更换表达方式：用不同的视角、场景、或人物反应来呈现相似情节');
    }

    // 标题重复
    if (issuesByType.title_duplicate) {
      suggestions.push('更换章节标题：确保与已有标题有明显区别，可从情节转折点、人物状态、关键冲突等角度命名');
    }

    // 人物弧光
    if (issuesByType.character_arc) {
      suggestions.push('强化人物弧光：至少设计一个情感/认知/关系/处境变化，避免人物只是"反应机器"');
      suggestions.push('增加人物主动行动：从"被动应对"转向"主动决策"');
    }

    // 情节推进
    if (issuesByType.plot_progress) {
      suggestions.push('推进情节：揭示新信息、引入新冲突、改变现状、或埋设钩子');
      suggestions.push('避免原地踏步：本章必须在至少一个维度上改变故事状态');
    }

    // 世界观一致性
    if (issuesByType.consistency) {
      suggestions.push('保持世界观一致性：检查科技水平、能力边界、规则设定是否与前文冲突');
      suggestions.push('新设定需解释：引入新元素时，要给出合理的背景或因果关系');
    }

    return suggestions;
  }

  /**
   * 简单的字符串相似度计算（编辑距离）
   */
  private similarity(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    // 简化版编辑距离
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - distance / maxLen;
  }

  /**
   * 编辑距离算法
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const dp: number[][] = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i]![0] = i;
    for (let j = 0; j <= len2; j++) dp[0]![j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1,      // 删除
          dp[i]![j - 1]! + 1,      // 插入
          dp[i - 1]![j - 1]! + cost // 替换
        );
      }
    }

    return dp[len1]![len2]!;
  }
}
