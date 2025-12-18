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
- ⚠️ **标题唯一**：不得与已有章节标题重复或高度相似
- **自然衔接**：承接上一章的结尾状态（时间、空间、人物情绪）
- **情节推进**：不可原地踏步，必须有新事件
- **设定延续**：遵守前文的世界规则、能力边界、科技水平
- **元素迭代**：复用前文元素时必须升级版本
- **人物弧光**：至少一个主要人物要有状态变化
- **伏笔机制**：可选择回应或埋下伏笔`;
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
    return `**工具使用**：
前文章节较多，可按需查询：
- list_chapters：列出所有章节
- retrieve_chapter：检索特定章节
- search_content：搜索关键词

**⚠️ 约束**：
- 工具调用最多5轮，完成后立即创作
- 直接输出章节内容，不要"我先查看..."等元对话
- 不要返回空响应或思考过程
- 输出必须是完整章节（标题+正文）

**正确示例**：✅ 第十九章：玉简真解\n金光如潮水般退去...
**错误示例**：❌ 我先查看一下前文...（这是思考，不是小说）
`;
  }

  private buildWritingGuide(wordCount: number): string {
    return `
**核心写作原则**（每个字都必须有存在的理由）：

1. **Show, Don't Tell**（展示，不要讲述）
   ❌ 删除："他明白了...""他感觉到...""他很震惊"
   ✅ 改用：动作、细节、对话

   示例：
   ❌ 李四很生气，他愤怒地看着对方
   ✅ 李四指甲掐进掌心，盯着对方不说话

2. **删除过度装饰**
   ❌ 每10句话最多1个比喻，砍掉无意义的"像...一样"
   ✅ 比喻必须服务于意境或人物，不为装饰而装饰

   示例：
   ❌ 雨下得像掌柜的算盘珠子，一颗一颗砸在瓦上
   ✅ 雨砸在瓦上

3. **对话极简化**
   - 每轮对话≤2句，删除重复信息
   - 删除"他说""他回答""他冷笑道"等提示语
   - 用动作/表情替代提示语

   示例：
   ❌ 钱老板笑着说："押刀。"赵不稳无奈地回答："没带。"
   ✅ 钱老板："押刀。""没带。"

4. **删除解释型插入**
   - 回忆插入≤30字
   - 不在主线高潮时插入解释
   - 删除"现在他明白"式总结

   示例：
   ❌ 他看着掌心那朵缺角梅，忽然想起三年前的事...（200字回忆）
   ✅ 他看着掌心那朵缺角梅，想起三年前有人替他挡过一刀

5. **避免作者讲道理**
   - 删除哲理金句、宣言式结尾
   - 用画面/动作收尾，不用总结

   示例：
   ❌ 江湖从不问你愿不愿意，它只问你还不还得起
   ✅ 赵不稳把手揣进怀里，走进夜色

**内容占比公式**（${wordCount}字分配）：
- 核心冲突：60%（必须在前30%篇幅出现）
- 环境描写：5%（1个核心意象即可）
- 日常对话：10%（每轮≤2句）
- 世界观展示：10%（通过主线展示，不单独解释）
- 人物塑造：10%（3个不同维度的细节）
- 悬念/钩子：5%（结尾留白，不总结）

**扩充字数策略**（从核心向外扩展）：
1. 五感环境（视听触嗅味）
2. 微表情、肢体语言
3. 内心多层思考（表层→深层→联想→决策）
4. 对话中的停顿、试探、迂回

**禁止行为**：
❌ 用"好家伙""震惊""卧槽"反复填充
❌ 场景描写原地重复
❌ 无意义流水账（"他走到门口，打开门，走了出去"）
❌ 过度省略号和感叹号

**元素复用规则**：
如复用前文元素（设定/动作/口头禅/梗），必须版本升级：
- 深化：表面→原因
- 反转：正面→隐藏面
- 后果：动作→影响
- 对比：单一→对照

**人物弧光**（至少满足一项）：
□ 情感变化
□ 认知更新
□ 关系演变
□ 能力/处境变化

**情节推进**（至少满足一项）：
□ 揭示新信息
□ 引入新冲突
□ 改变现状
□ 埋设钩子

**自检清单**（写完必检查）：
□ 存在性：这句删掉会损失什么？若无，删
□ 装饰性：这个比喻必须吗？换成直接描述会更好吗？
□ 节奏性：能压缩到一半吗？
□ 展示性：是在"告诉"还是"展示"？
□ 逻辑性：角色行为符合设定和动机吗？

**输出格式**：
- title: 章节标题（简洁有力）
- summary: 章节简介（20-50字）
- content: 章节正文（${wordCount}字，±10%，仅正文，不含标题简介）
- clues（可选）：伏笔列表
- resolvedClueIds（可选）：回填的伏笔ID

**记住：简约即优雅，删除即完美。读者需要的是流畅、紧凑、有冲击力的故事。**
`;
  }

  private buildFirstChapterHint(): string {
    return `

**第一章特殊要求**：
- 核心冲突必须在前30%出现
- 世界观通过具体事件展现，不用旁白说明
- 人物通过行动和对话展现，避免"他是个xxx的人"
- 前1/3设置吸引读者的悬念或冲突
- 通过叙述节奏、用词风格确立整部作品基调`;
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
