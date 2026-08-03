import { Inject, Injectable } from '@sker/core';
import { ChapterData, Clue, StoryWeaverAst } from '@sker/workflow-ast';
import { StoryContextService } from './StoryContextService';
import { buildToolsHint, buildWritingGuide, buildFirstChapterHint, buildPreviousContext } from './prompt-templates';

/**
 * 提示词构建器
 * 职责：构建各类提示词（系统提示、用户提示、改进提示）
 */
@Injectable()
export class PromptBuilder {
  constructor(
    @Inject(StoryContextService) private contextService: StoryContextService
  ) {}
  // step 1: 系统提示词
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

${useTools ? buildToolsHint() : ''}${buildWritingGuide(ast.wordCount)}`;

    if (isFirstChapter) {
      return basePrompt + buildFirstChapterHint();
    }

    const existingTitles = chapters.map(ch => ch.title).join('、');
    const extractedSettings = this.contextService.extractKeySettings(chapters);
    const previousContext = buildPreviousContext(chapters, useTools);

    return basePrompt + `

**前文章节回顾**：
${previousContext}

**已存在的章节标题**：
${existingTitles}

**前文关键设定元素**（必须保持一致）：
${extractedSettings}

**续写要点**（第 ${chapterNumber} 章）：
- ⚠️ **标题唯一**：不得与已有章节标题重复或高度相似
- **自然衔接**：承接上一章的结尾状态（时间、空间、人物情绪）
- **情节推进**：不可原地踏步，必须有新事件
- **设定延续**：遵守前文的世界规则、能力边界、科技水平
- **元素迭代**：复用前文元素时必须升级版本
- **人物弧光**：至少一个主要人物要有状态变化
- **伏笔机制**：可选择回应或埋下伏笔`;
  }
  // step1: 用户提示词
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
  // step2: 改进提示词
  buildSelfRefinePrompt(draftText: string, wordCount: number): string {
    return `你是专业小说编辑。下面是你刚写的草稿，请改进它。

**改进清单**（逐项检查）：
□ Show Don't Tell：删除"他感到/觉得/明白/震惊"，改用动作、细节
□ 对话精简：每轮对话≤2句，删除冗余提示语
□ 删除装饰：删除无意义的比喻和形容词
□ 分段合理：每300字左右分段
□ 标点克制：省略号/感叹号不过度使用
□ 字数控制：${wordCount}字±10%

**要求**：
- 直接输出改进后的章节，不要解释过程
- 保留优秀部分，只改进问题部分
- 输出格式与草稿相同

---草稿开始---
${draftText}
---草稿结束---

请输出改进版本：`;
  }
  // step3: 结构化提示词
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
}
