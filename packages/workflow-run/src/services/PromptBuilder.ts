import { Inject, Injectable } from '@sker/core';
import { ChapterData, Clue, StoryWeaverAst } from '@sker/workflow-ast';
import { QualityCheckResult } from './ChapterQualityService';
import { StoryContextService } from './StoryContextService';

/**
 * 提示词构建器
 * 职责：构建各类提示词（系统提示、用户提示、改进提示）
 */
@Injectable()
export class PromptBuilder {
  constructor(
    @Inject(StoryContextService) private contextService: StoryContextService
  ) {}

  buildSystemPrompt(
    ast: StoryWeaverAst,
    chapters: ChapterData[],
    isFirstChapter: boolean,
    chapterNumber: number,
    useTools = false
  ): string {
    const basePrompt = `你是一位资深小说家，正在创作一部小说的第 ${chapterNumber} 章。

**写作要求**：
- 风格：${ast.style}
- 本章字数：严格控制在 ${ast.wordCount} 字（偏差不超过±10%，低于 -20% 视为不合格）

${useTools ? this.buildToolsHint() : ''}${this.buildWritingGuide(ast.wordCount)}`;

    if (isFirstChapter) {
      return basePrompt + this.buildFirstChapterHint();
    }

    const existingTitles = chapters.map(ch => ch.title).join('、');
    const extractedSettings = this.contextService.extractKeySettings(chapters);
    const previousContext = this.buildPreviousContext(chapters, useTools);

    return basePrompt + `

**前文章节回顾**：
${previousContext}

**已存在的章节标题**：
${existingTitles}

**前文关键设定元素**（必须保持一致）：
${extractedSettings}

**续写要点**（第 ${chapterNumber} 章）：
- ⚠️ **章节标题必须唯一**，不得与已有章节标题重复或高度相似
- **自然衔接**：本章开头要承接上一章的结尾状态（时间、空间、人物情绪）
- **情节推进**：不可原地踏步或重复前文场景，必须有新的事件发生
- **设定延续**：遵守前文建立的世界规则、人物能力边界、科技水平
- **元素迭代**：如果复用前文的梗、设定、动作，必须有新的变化或深化
- **人物成长**：至少一个主要人物在本章要有情感/认知/行为的变化
- **伏笔回应**：可选择回应前文埋下的某个伏笔，或埋下新的伏笔

**质量自检清单**（完成后请对照）：
□ 字数达标（${ast.wordCount} ± 10%）
□ 无重复性描写（检查是否有与前文相似的场景/对话）
□ 人物有状态变化（不是单纯的"反应"）
□ 情节有实质推进（不是"震惊 → 震惊 → 震惊"的循环）
□ 世界观保持一致（没有突破前文设定的能力/科技上限）
□ 标题唯一（与已有标题不重复）`;
  }

  buildUserPrompt(
    chapterNumber: number,
    wordCount: number,
    prompts: string,
    pendingClues: Clue[]
  ): string {
    const pendingCluesHint = pendingClues.length > 0
      ? `\n\n**⏰ 待回填伏笔（${pendingClues.length}条）**：\n${pendingClues.map((clue, i) =>
          `${i + 1}. [${clue.id}] ${clue.description} (第${clue.chapterNumber}章埋下)`
        ).join('\n')}\n\n提示：可选择在本章回填部分伏笔，回填时需在 resolvedClueIds 中标注。`
      : '';

    return `请创作第 ${chapterNumber} 章。

**输出要求**：
- 直接输出完整的小说文本（${wordCount}字左右）
- 可选：在文本末尾说明本章埋下的伏笔或回填的伏笔
- 不需要特殊格式标记，自然流畅即可

**创作要求**：
${prompts}${pendingCluesHint}`;
  }

  buildImprovementHints(qualityResult: QualityCheckResult): string {
    const hints: string[] = [];

    const highIssues = qualityResult.issues.filter(i => i.severity === 'high');
    const mediumIssues = qualityResult.issues.filter(i => i.severity === 'medium');

    if (highIssues.length > 0) {
      hints.push('**🔴 严重问题（必须修复）：**');
      highIssues.forEach(issue => hints.push(`- ${issue.description}`));
    }

    if (mediumIssues.length > 0) {
      hints.push('\n**🟡 次要问题（建议修复）：**');
      mediumIssues.forEach(issue => hints.push(`- ${issue.description}`));
    }

    if (qualityResult.suggestions.length > 0) {
      hints.push('\n**💡 改进建议：**');
      qualityResult.suggestions.forEach(s => hints.push(`- ${s}`));
    }

    return hints.join('\n');
  }

  buildExtractionPrompt(rawText: string): string {
    return `从下面的小说文本中提取结构化元数据（不需要重新输出正文内容，只需标注正文的起止位置）：

---原始文本开始---
${rawText}
---原始文本结束---

请严格按照以下 JSON Schema 返回（必须是完整且格式正确的 JSON）：

\`\`\`json
{
  "title": "章节标题",
  "summary": "章节简介（20-50字）",
  "contentStartMarker": "正文开头的前20个字（用于定位）",
  "contentEndMarker": "正文结尾的后20个字（用于定位）",
  "clues": [
    {
      "id": "clue_ch17_mirror",
      "description": "伏笔描述",
      "status": "pending"
    }
  ],
  "resolvedClueIds": ["clue_ch10_xxx"]
}
\`\`\`

**字段说明**：
- title: 从原文中提取章节标题
- summary: 用 20-50 字简要概括本章内容
- contentStartMarker: 复制正文第一段的前 20 个字（不是标题）
- contentEndMarker: 复制正文最后一段的后 20 个字
- clues: 如有伏笔，提取为对象数组；如无可省略
- resolvedClueIds: 如回填了伏笔，提取其 ID；如无可省略

**重要**：
1. 只返回 JSON，不要有其他解释文字
2. 确保 JSON 完整，不要截断
3. 所有字符串用双引号
4. contentStartMarker 和 contentEndMarker 必须从原文中精确复制`;
  }

  private buildToolsHint(): string {
    return `**工具使用提示**：
由于前文章节较多，你可以使用以下工具按需查询：
- list_chapters：列出所有章节标题和简介
- retrieve_chapter：检索特定章节的完整内容
- search_content：在前文中搜索关键词

建议：先 list_chapters 了解全局，再根据需要 retrieve_chapter 或 search_content。

**⚠️ 工具调用约束（必须遵守）**：
- 工具调用最多 5 轮，超过后必须立即开始创作
- 当你完成所有必要的工具调用后，**必须立即开始创作章节内容**
- **不要**在响应中说"我先查看"、"让我了解"、"我需要"等元对话（meta-commentary）
- **不要**返回空响应或只包含思考过程的文本
- 如果信息已足够，请直接开始创作，不要继续调用工具
- 你的响应必须是**完整的章节文本**（标题 + 正文），而不是计划、说明或思考过程

**正确示例**：
✅ 直接输出：
# 第十九章：玉简真解

金光如潮水般退去，蛛楼重归昏暗...

**错误示例**：
❌ 错误：我先查看一下前文的章节，了解故事进展...
❌ 错误：让我检索一下第16章的内容...
❌ 错误：暂无明确章节标题（这是思考过程，不是小说内容）
`;
  }

  private buildWritingGuide(wordCount: number): string {
    return `**字数达标策略**（必读）：
当字数不足时，通过以下维度扩充（按优先级排序）：
1. **环境细节雕刻**（+25%字数）：
   - 用五感描写场景（视觉、听觉、触觉、嗅觉、味觉）
   - 物品的材质、颜色、纹理、状态
   - 人物的微表情、肢体语言、服饰细节
   - 避免抽象概括，改用具象画面

2. **内心戏深化**（+35%字数）：
   - 多层心理活动：表层反应 → 深层思考 → 联想回忆 → 决策过程
   - 情绪的矛盾与冲突（如：震惊中夹杂困惑、恐惧中混合好奇）
   - 人物的推理链条和信息处理过程
   - 避免"他很震惊"这种直给，改用内心独白展现

3. **对话张力构建**（+20%字数）：
   - 对话不要直给答案，设计试探、迂回、误解
   - 加入对话中的停顿、语气变化、肢体动作
   - 通过对话暗示人物关系和权力动态
   - 避免"Q: xxx A: xxx"的问答模式

4. **伏笔与回应**（+20%字数）：
   - 埋下本章的小伏笔（道具、细节、异常现象）
   - 回应前文章节的伏笔或设定
   - 设计信息的递进式揭示（分多次暴露关键信息）

**禁止的凑字数行为**：
❌ 用"好家伙""震惊""卧槽"等口头禅反复填充
❌ 场景描写原地重复（如：多次描写同一个动作）
❌ 无意义的流水账（"他走到门口，打开门，走了出去"）
❌ 过度使用省略号和感叹号撑版面

**元素复用规则**（核心约束）：
- 如果本章使用了前文章节中已出现的：特定设定、标志性动作、口头禅、梗、比喻
- 则必须进行版本升级，不可原样照搬：

  版本升级方式：
  • 深化：从表面现象 → 揭示背后原因
  • 反转：从正面描写 → 展现隐藏的另一面
  • 后果：从动作本身 → 展现该动作导致的影响
  • 对比：从单一场景 → 与其他场景/人物形成对照

  示例：
  ❌ 错误：第1章"他翘着兰花指" → 第3章"他又翘着兰花指"（原样重复）
  ✅ 正确：第1章"他翘着兰花指" → 第3章"那只翘着兰花指的手突然握紧成拳，指甲扎进掌心"（行为转变）

**世界观一致性**（必须遵守）：
- 科技水平：前文出现的科技上限不可随意突破（如：前文最高科技是手机，本章不可突然出现时空穿梭机）
- 能力边界：人物的能力要符合前文设定（如：前文说某人不会武功，本章不可突然飞檐走壁）
- 规则延续：前文建立的世界规则必须延续（如：前文说系统有CD时间，本章不可无限使用）
- 设定追踪：本章引入新设定时，要与前文设定兼容或给出合理解释

**人物弧光要求**：
- 人物在本章必须有状态变化（至少满足一项）：
  • 情感变化：从 [情感A] 转向 [情感B]（如：从恐惧到好奇）
  • 认知更新：获得新信息，改变对某事的看法
  • 关系演变：与其他角色的关系发生变化
  • 能力/处境变化：学会新技能/陷入新困境/获得新资源

- 避免人物成为"反应机器"：
  ❌ 错误：全章只有"震惊 → 吐槽 → 再震惊"的循环
  ✅ 正确：震惊 → 分析 → 试探 → 形成判断 → 做出行动

**情节推进标准**：
本章结束时，至少要实现以下一项：
□ 揭示新信息（世界观、人物背景、阴谋线索）
□ 引入新冲突（角色对立、环境威胁、内心矛盾）
□ 改变现状（权力关系变化、空间转移、任务目标更新）
□ 埋设钩子（悬念、伏笔、待解之谜）

**伏笔管理机制**：
- clues（可选）：本章埋下的新伏笔，需指定唯一ID（如 clue_ch2_mirror）
- resolvedClueIds（可选）：本章回填的伏笔ID列表
- 伏笔回填策略：自然融入剧情，避免刻意集中解密
- 示例：埋下伏笔 {"id": "clue_ch2_mirror", "description": "铜镜倒映异象", "status": "pending"}

**输出要求**：
- title: 章节标题（简洁有力）
- summary: 章节简介（20-50字）
- content: 章节正文（${wordCount}字，±10%）
  ⚠️ content 只包含正文，不要重复输出标题、简介、伏笔说明等元数据
- clues（可选）：伏笔列表
- resolvedClueIds（可选）：回填的伏笔ID
`;
  }

  private buildFirstChapterHint(): string {
    return `

**第一章特殊要求**：
- 世界观建立：通过具体事件展现世界规则（不要用旁白式说明）
- 人物引入：通过行动和对话展现人物性格（避免"他是个xxx的人"的直接介绍）
- 钩子设置：在前1/3处设置吸引读者的悬念或冲突
- 基调确立：通过叙述节奏、用词风格确立整部作品的调性`;
  }

  private buildPreviousContext(chapters: ChapterData[], useTools: boolean): string {
    if (useTools) {
      return '**章节总览**（使用工具查询详细内容）：\n' +
        chapters.map(ch => `- 第${ch.chapterNumber}章：${ch.title}（${ch.summary}）`).join('\n');
    }

    const recentChapters = chapters.slice(-3);
    const olderChapters = chapters.slice(0, -3);
    let context = '';

    if (olderChapters.length > 0) {
      context += '**早期章节**（仅标题）：\n';
      context += olderChapters.map(ch => `- 第${ch.chapterNumber}章：${ch.title}`).join('\n');
      context += '\n\n';
    }

    if (recentChapters.length > 0) {
      context += '**近期章节**（详细回顾）：\n\n';
      context += recentChapters.map(ch => {
        const preview = ch.content.substring(0, 400);
        return `## 第 ${ch.chapterNumber} 章：${ch.title}

**简介**：${ch.summary}

**关键情节**（前400字）：
${preview}${ch.content.length > 400 ? '...' : ''}
`;
      }).join('\n\n');
    }

    return context;
  }
}
