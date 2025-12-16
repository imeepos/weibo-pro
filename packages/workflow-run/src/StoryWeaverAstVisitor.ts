import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ChapterData, Clue, StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, from, of, throwError } from 'rxjs';
import { concatMap, distinctUntilChanged, expand, map, catchError, scan, takeWhile, filter, tap, take, last } from 'rxjs/operators';
import { useLlmModel } from './llm-client';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChapterQualityService, QualityCheckResult } from './services/ChapterQualityService';



@Injectable()
export class StoryWeaverAstVisitor {
  constructor(
    @Inject(ChapterQualityService) private qualityService: ChapterQualityService
  ) { }

  @Handler(StoryWeaverAst)
  visit(ast: StoryWeaverAst, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });

      const subscription = input$.pipe(
        distinctUntilChanged(),
        concatMap((inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            return throwError(() => new Error('工作流已取消'));
          }

          return this.generateChapterWithRetry(ast, abortController.signal);
        }),
        map((events: NodeEvent[]) => events)
      ).subscribe({
        next: (events: NodeEvent[]) => {
          events.forEach(event => obs.next(event));
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, data: ast });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id, data: ast });
          obs.complete();
        }
      });

      return () => {
        console.log('[StoryWeaverAstVisitor] 订阅被取消，触发 AbortSignal');
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  /**
   * 使用 RxJS 实现章节生成 + 质检 + 重试的完整流程
   */
  private generateChapterWithRetry(ast: StoryWeaverAst, signal: AbortSignal): Observable<NodeEvent[]> {
    // 章节输出 Schema
    const ChapterOutputSchema = z.object({
      title: z.string().describe('章节标题（简洁有力，体现核心冲突）'),
      summary: z.string().describe('章节简介，用一个七言绝句概括核心情节'),
      content: z.string().describe(`章节正文（${ast.wordCount}字左右，偏差不超过±10%）。注意：只包含正文内容，不要重复输出标题和简介`),
      clues: z.array(z.object({
        id: z.string().describe('伏笔唯一ID（如 clue_chapter2_mirror）'),
        description: z.string().describe('伏笔描述'),
        status: z.enum(['pending', 'resolved']).describe('状态：pending待回填 / resolved已回填')
      })).optional().describe('本章埋下的伏笔列表（可选）'),
      resolvedClueIds: z.array(z.string()).optional().describe('本章回填的伏笔ID列表（可选）')
    });

    // previousChapters 是内部状态，会自动累积（stateful 节点）
    // 过滤掉空章节（避免空章节污染前文回顾）
    const chapters = (ast.previousChapters || []).filter(ch => ch.content && ch.content.trim().length > 0);
    const isFirstChapter = chapters.length === 0;
    const nextChapterNumber = isFirstChapter ? 1 : Math.max(...chapters.map(c => c.chapterNumber)) + 1;

    console.log(`[StoryWeaver] 章节计算: previousChapters.length=${ast.previousChapters?.length ?? 0}, validChapters=${chapters.length}, nextChapter=${nextChapterNumber}`);

    // 提取已存在的章节标题（用于去重检查）
    const existingTitles = new Set(chapters.map(ch => this.normalizeTitle(ch.title)));

    // 根据章节数量决定是否启用工具模式
    const useTools = chapters.length > 10;  // 超过 10 章启用工具模式

    const baseModel = useLlmModel({ model: ast.model, temperature: ast.temperature });

    // 工具模式：绑定查询工具（不使用结构化输出）
    const model = useTools ? baseModel.bindTools(this.createStoryTools(chapters)) : baseModel;

    if (useTools) {
      console.log(`[StoryWeaver] 启用工具模式（已有 ${chapters.length} 章）`);
    }

    const systemPrompt = this.buildSystemPrompt(ast, chapters, isFirstChapter, nextChapterNumber, useTools);
    const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt;

    // 构建待回填伏笔列表
    const pendingClues = this.collectPendingClues(chapters);
    const pendingCluesHint = pendingClues.length > 0
      ? `\n\n**⏰ 待回填伏笔（${pendingClues.length}条）**：\n${pendingClues.map((clue, i) =>
        `${i + 1}. [${clue.id}] ${clue.description} (第${clue.chapterNumber}章埋下)`
      ).join('\n')}\n\n提示：可选择在本章回填部分伏笔，回填时需在 resolvedClueIds 中标注。`
      : '';

    const userPrompt = `请创作第 ${nextChapterNumber} 章。

**输出要求**：
- 直接输出完整的小说文本（${ast.wordCount}字左右）
- 可选：在文本末尾说明本章埋下的伏笔或回填的伏笔
- 不需要特殊格式标记，自然流畅即可

**创作要求**：
${prompts}${pendingCluesHint}`;

    // 使用 expand 创建重试循环，使用 scan 累积所有尝试结果
    return of({ attempt: 0, improvementHints: '', allAttempts: [] as Array<{ chapter: ChapterData; quality: QualityCheckResult; attempt: number }> }).pipe(
      expand((state) => {
        // 达到最大重试次数则停止
        if (state.attempt >= (ast.maxRewriteRetries || 2)) {
          return of(); // 完成，展开操作符结束
        }

        // 构建当前轮次的提示词（追加改进要求）
        let currentUserPrompt = userPrompt;
        if (state.improvementHints) {
          currentUserPrompt += `\n\n**⚠️ 上一版本质量问题（需改进）**：\n${state.improvementHints}`;
        }

        // 第一步：调用 LLM 生成章节（纯文本输出，可使用工具）
        console.log(`[StoryWeaver] 第${nextChapterNumber}章生成中...（第${state.attempt + 1}次尝试）`);
        return from(model.invoke(
          [
            { role: 'system', content: systemPrompt },
            { role: 'human', content: currentUserPrompt }
          ],
          { signal }
        )).pipe(
          // 第二步：提取文本内容
          concatMap((response: any) => {
            const rawText = response.content || response.text || String(response);
            console.log(`[StoryWeaver] 生成文本长度: ${rawText.length} 字`);

            // 第三步：用结构化输出解析文本
            const extractionPrompt = `请从下面的小说文本中提取结构化信息：

${rawText}

---

请严格按照 JSON Schema 提取以下信息：
- title: 章节标题
- summary: 章节简介（20-50字）
- content: 正文内容（不包括标题、简介、伏笔说明等元数据）
- clues: 本章埋下的伏笔列表（可选）
- resolvedClueIds: 本章回填的伏笔ID列表（可选）`;

            const extractionModel = baseModel.withStructuredOutput(ChapterOutputSchema);

            return from(extractionModel.invoke([
              { role: 'system', content: '你是一个文本结构化提取专家，精确提取小说章节的元数据。' },
              { role: 'human', content: extractionPrompt }
            ], { signal }));
          }),
          // 清理和验证生成的内容
          map((parsed: z.infer<typeof ChapterOutputSchema>) => {
            // 清理 content 中重复的标题和简介
            let cleanedContent = this.cleanContent(parsed.content, parsed.title, parsed.summary);

            // 标准化标题并检查重复
            const normalizedTitle = this.normalizeTitle(parsed.title);

            if (existingTitles.has(normalizedTitle)) {
              // 标题重复，构建改进提示
              throw new Error(`TITLE_DUPLICATE:${parsed.title}`);
            }

            // 生成章节数据
            return {
              chapter: {
                chapterNumber: nextChapterNumber,
                title: parsed.title,
                summary: parsed.summary,
                content: cleanedContent,
                clues: parsed.clues?.map(clue => ({
                  ...clue,
                  chapterNumber: nextChapterNumber
                })),
                resolvedClueIds: parsed.resolvedClueIds
              } as ChapterData,
              attempt: state.attempt
            };
          }),
          // 质检步骤（如果启用）
          concatMap(({ chapter, attempt }) => {
            if (!ast.enableQualityCheck) {
              return of({ chapter, quality: { score: 100, issues: [], suggestions: [], passed: true } as QualityCheckResult, attempt });
            }

            console.log(`[StoryWeaver] 第${nextChapterNumber}章质检中...（第${attempt + 1}次尝试）`);

            // 简化的质检重试逻辑
            const defaultQuality: QualityCheckResult = {
              score: 70,
              issues: [],
              suggestions: ['质检服务暂时不可用，已使用默认评分'],
              passed: false
            };

            const doQualityCheck = (retryCount: number): Observable<QualityCheckResult> => {
              if (retryCount >= 3) {
                console.warn(`[StoryWeaver] 质检重试次数已达上限（3次），使用默认评分 70`);
                return of(defaultQuality);
              }

              return from(this.qualityService.check(chapter, chapters, ast.wordCount, signal)).pipe(
                catchError((error) => {
                  console.warn(`[StoryWeaver] 质检失败（${retryCount + 1}/3）: ${error.message}`);
                  if (retryCount < 2) {
                    const backoffDelay = 1000 * Math.pow(2, retryCount);
                    return from(new Promise<void>(resolve => setTimeout(resolve, backoffDelay))).pipe(
                      concatMap(() => doQualityCheck(retryCount + 1))
                    );
                  }
                  console.warn(`[StoryWeaver] 质检失败 3 次，使用默认评分 70`);
                  return of(defaultQuality);
                })
              );
            };

            return doQualityCheck(0).pipe(
              map((qualityResult) => {
                console.log(`[StoryWeaver] 质检完成，最终评分: ${qualityResult.score}/100`);
                return { chapter, quality: qualityResult, attempt };
              })
            );
          }),
          // 处理质检结果，决定是否需要重试
          map(({ chapter, quality, attempt }) => {
            console.log(`[StoryWeaver] 第${nextChapterNumber}章质量评分：${quality.score}/100`);

            // 如果达到目标分数，停止重试（设置 attempt 为最大值以终止 expand）
            if (quality.score >= ast.minQualityScore) {
              return {
                result: { chapter, quality, attempt },
                improvementHints: '',
                attempt: ast.maxRewriteRetries ?? 2  // 达到最大值，expand 将终止
              };
            }

            // 未达标，构建改进提示
            const improvementHints = this.buildImprovementHints(quality);

            return {
              result: { chapter, quality, attempt },
              improvementHints,
              attempt: attempt + 1  // expand 需要此字段判断是否继续
            };
          }),
          // 捕获标题重复错误
          catchError((error) => {
            if (error.message.startsWith('TITLE_DUPLICATE:')) {
              const title = error.message.replace('TITLE_DUPLICATE:', '');
              const improvementHints = `❌ 标题重复："${title}"与已有章节标题重复，请重新构思一个完全不同的标题\n`;
              return of({
                result: null,
                improvementHints,
                attempt: state.attempt + 1
              });
            }
            return throwError(() => error);
          })
        );
      }),
      // 累积所有尝试的结果（严格检查 result 的有效性）
      scan((acc: {
        attempt: number;
        improvementHints: string;
        allAttempts: Array<{ chapter: ChapterData; quality: QualityCheckResult; attempt: number }>;
      }, curr: any) => {
        // 严格检查 result 的有效性：必须有 result 且 chapter 和 quality 都存在
        if (curr.result &&
            curr.result.chapter &&
            curr.result.quality &&
            typeof curr.result.quality.score === 'number') {
          acc.allAttempts.push(curr.result);
        } else {
          console.warn(`[StoryWeaver] 跳过无效的重试结果:`, curr);
        }

        return {
          attempt: typeof curr.attempt === 'number' ? curr.attempt : acc.attempt,
          improvementHints: curr.improvementHints || '',
          allAttempts: acc.allAttempts
        };
      }, { attempt: 0, improvementHints: '', allAttempts: [] as Array<{ chapter: ChapterData; quality: QualityCheckResult; attempt: number }> }),
      // 取最后一个状态（所有尝试完成）
      last(),
      map((finalState: {
        attempt: number;
        improvementHints: string;
        allAttempts: Array<{ chapter: ChapterData; quality: QualityCheckResult; attempt: number }>;
      }) => {
        // 选择评分最高的版本
        const bestAttempt = finalState.allAttempts.length > 0
          ? finalState.allAttempts.reduce((best: { chapter: ChapterData; quality: QualityCheckResult; attempt: number }, current: { chapter: ChapterData; quality: QualityCheckResult; attempt: number }) =>
              current.quality.score > best.quality.score ? current : best
            )
          : null;

        if (!bestAttempt) {
          console.error(`[StoryWeaver] 第${nextChapterNumber}章所有重试都失败，无有效结果`);
          throw new Error(`第${nextChapterNumber}章生成失败：所有重试尝试都未产生有效结果`);
        }

        const { chapter: chapterData, quality: qualityResult } = bestAttempt;

        // 输出质量报告（如果启用质检）
        if (ast.enableQualityCheck) {
          console.log(`[StoryWeaver] 第${nextChapterNumber}章质量报告（最佳版本，尝试 ${bestAttempt.attempt + 1}）：`);
          console.log(`  - 综合评分：${qualityResult.score}/100`);
          console.log(`  - 质量问题数：${qualityResult.issues.length}`);
          if (qualityResult.issues.length > 0) {
            qualityResult.issues.forEach((issue: any) => {
              console.log(`    [${issue.severity}] ${issue.type}: ${issue.description}`);
            });
          }
          if (qualityResult.suggestions.length > 0) {
            console.log(`  - 改进建议：`);
            qualityResult.suggestions.forEach((s: any) => console.log(`    • ${s}`));
          }
        }

        // 自动累积章节到内部状态（stateful 保证下次运行时保留）
        // 检查是否已存在相同章节号，如果存在则更新，否则添加
        const existingIndex = ast.previousChapters.findIndex(ch => ch.chapterNumber === nextChapterNumber);
        if (existingIndex >= 0) {
          ast.previousChapters[existingIndex] = chapterData;
        } else {
          ast.previousChapters.push(chapterData);
        }

        ast.title = chapterData.title;
        ast.summary = chapterData.summary;
        ast.content = chapterData.content;
        ast.chapterNumber = chapterData.chapterNumber;
        ast.chapterData = chapterData;

        // 检查是否需要继续生成下一章
        const isComplete = ast.previousChapters.length >= ast.targetChapterCount;
        ast.isComplete = isComplete;

        // 如果未完成，触发下一轮生成
        let nextPrompt = '';
        if (!isComplete) {
          nextPrompt = `继续创作第 ${nextChapterNumber + 1} 章。前情提要：${chapterData.summary}`;
          ast.nextPrompt = nextPrompt;
        }

        const emitEvents: NodeEvent[] = [
          { type: 'node_emit' as const, id: ast.id, property: 'title', value: chapterData.title },
          { type: 'node_emit' as const, id: ast.id, property: 'summary', value: chapterData.summary },
          { type: 'node_emit' as const, id: ast.id, property: 'content', value: chapterData.content },
          { type: 'node_emit' as const, id: ast.id, property: 'chapterNumber', value: chapterData.chapterNumber },
          { type: 'node_emit' as const, id: ast.id, property: 'chapterData', value: chapterData },
          { type: 'node_emit' as const, id: ast.id, property: 'previousChapters', value: ast.previousChapters },
          { type: 'node_emit' as const, id: ast.id, property: 'isComplete', value: isComplete }
        ];

        // 只有未完成时才发射 nextPrompt（router 端口会过滤 undefined）
        if (!isComplete) {
          emitEvents.push({ type: 'node_emit' as const, id: ast.id, property: 'nextPrompt', value: nextPrompt });
        }

        return emitEvents;
      })
    );
  }


  /**
   * 标准化章节标题（用于去重检查）
   * 移除章节号前缀、空格、标点符号，统一为小写
   */
  private normalizeTitle(title: string): string {
    return title
      .replace(/^第.+?章[：:\s]*/g, '') // 移除"第X章："前缀
      .replace(/\s+/g, '') // 移除所有空格
      .replace(/[，。！？；：、""''（）《》【】]/g, '') // 移除中文标点
      .toLowerCase() // 转小写
      .trim();
  }

  private buildSystemPrompt(ast: StoryWeaverAst, chapters: ChapterData[], isFirstChapter: boolean, chapterNumber: number, useTools = false): string {
    const basePrompt = `你是一位资深小说家，正在创作一部小说的第 ${chapterNumber} 章。

**写作要求**：
- 风格：${ast.style}
- 本章字数：严格控制在 ${ast.wordCount} 字（偏差不超过±10%，低于 -20% 视为不合格）

${useTools ? `**工具使用提示**：
由于前文章节较多，你可以使用以下工具按需查询：
- list_chapters：列出所有章节标题和简介
- retrieve_chapter：检索特定章节的完整内容
- search_content：在前文中搜索关键词

建议：先 list_chapters 了解全局，再根据需要 retrieve_chapter 或 search_content。
` : ''}
**字数达标策略**（必读）：
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
- clues（可选）：本章埋下的新伏笔，需指定唯一ID（如 clue_ch${chapterNumber}_mirror）
- resolvedClueIds（可选）：本章回填的伏笔ID列表
- 伏笔回填策略：自然融入剧情，避免刻意集中解密
- 示例：埋下伏笔 {"id": "clue_ch2_mirror", "description": "铜镜倒映异象", "status": "pending"}

**输出要求**：
- title: 章节标题（简洁有力）
- summary: 章节简介（20-50字）
- content: 章节正文（${ast.wordCount}字，±10%）
  ⚠️ content 只包含正文，不要重复输出标题、简介、伏笔说明等元数据
- clues（可选）：伏笔列表
- resolvedClueIds（可选）：回填的伏笔ID
`;

    if (isFirstChapter) {
      return basePrompt + `

**第一章特殊要求**：
- 世界观建立：通过具体事件展现世界规则（不要用旁白式说明）
- 人物引入：通过行动和对话展现人物性格（避免"他是个xxx的人"的直接介绍）
- 钩子设置：在前1/3处设置吸引读者的悬念或冲突
- 基调确立：通过叙述节奏、用词风格确立整部作品的调性`;
    }

    // 提取所有已有章节标题（用于去重）
    const existingTitles = chapters.map(ch => ch.title).join('、');

    // 提取前文的关键设定元素（用于一致性检查）
    const extractedSettings = this.extractKeySettings(chapters);

    let previousContext = '';

    if (useTools) {
      // 工具模式：只提供章节总览，让 LLM 使用工具按需查询
      previousContext = '**章节总览**（使用工具查询详细内容）：\n';
      previousContext += chapters.map(ch => `- 第${ch.chapterNumber}章：${ch.title}（${ch.summary}）`).join('\n');
    } else {
      // 非工具模式：构建精简的前文回顾（只保留最近3章详细信息）
      const recentChapters = chapters.slice(-3);
      const olderChapters = chapters.slice(0, -3);

      if (olderChapters.length > 0) {
        previousContext += '**早期章节**（仅标题）：\n';
        previousContext += olderChapters.map(ch => `- 第${ch.chapterNumber}章：${ch.title}`).join('\n');
        previousContext += '\n\n';
      }

      if (recentChapters.length > 0) {
        previousContext += '**近期章节**（详细回顾）：\n\n';
        previousContext += recentChapters.map(ch => {
          return `## 第 ${ch.chapterNumber} 章：${ch.title}

**简介**：${ch.summary}

**关键情节**（前400字）：
${ch.content.substring(0, 400)}${ch.content.length > 400 ? '...' : ''}
`;
        }).join('\n\n');
      }
    }

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

  /**
   * 从前文章节中提取关键设定元素
   * 用于提醒 LLM 保持世界观一致性
   */
  private extractKeySettings(chapters: ChapterData[]): string {
    if (chapters.length === 0) return '（暂无）';

    // 简单的关键词提取：从简介和内容前500字中寻找设定相关的句子
    const settingKeywords = ['系统', '穿越', '能力', '规则', '世界', '设定', '科技', '魔法', '武功', '等级'];
    const foundSettings: string[] = [];

    // 只分析最近3章，避免提示词过长
    const recentChapters = chapters.slice(-3);

    for (const chapter of recentChapters) {
      const text = `${chapter.summary} ${chapter.content.substring(0, 500)}`;

      // 查找包含设定关键词的句子
      const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 10);
      for (const sentence of sentences) {
        if (settingKeywords.some(kw => sentence.includes(kw))) {
          foundSettings.push(`- 第${chapter.chapterNumber}章：${sentence.trim()}`);
          if (foundSettings.length >= 5) break; // 最多提取5条
        }
      }
      if (foundSettings.length >= 5) break;
    }

    return foundSettings.length > 0
      ? foundSettings.join('\n')
      : '（前文未明确建立特殊设定，本章可自由发挥但需为后续章节考虑一致性）';
  }

  /**
   * 构建改进提示（基于质检结果）
   * 将质检问题转换为 LLM 可理解的改进指令
   */
  private buildImprovementHints(qualityResult: QualityCheckResult): string {
    const hints: string[] = [];

    // 按严重程度分组
    const highIssues = qualityResult.issues.filter(i => i.severity === 'high');
    const mediumIssues = qualityResult.issues.filter(i => i.severity === 'medium');

    // 高优先级问题
    if (highIssues.length > 0) {
      hints.push('**🔴 严重问题（必须修复）：**');
      highIssues.forEach(issue => {
        hints.push(`- ${issue.description}`);
      });
    }

    // 中优先级问题
    if (mediumIssues.length > 0) {
      hints.push('\n**🟡 次要问题（建议修复）：**');
      mediumIssues.forEach(issue => {
        hints.push(`- ${issue.description}`);
      });
    }

    // 改进建议
    if (qualityResult.suggestions.length > 0) {
      hints.push('\n**💡 改进建议：**');
      qualityResult.suggestions.forEach(s => {
        hints.push(`- ${s}`);
      });
    }

    return hints.join('\n');
  }

  /**
   * 收集所有待回填的伏笔
   */
  private collectPendingClues(chapters: ChapterData[]): Clue[] {
    const allClues: Clue[] = [];
    const resolvedIds = new Set<string>();

    // 收集所有已回填的伏笔ID
    for (const chapter of chapters) {
      if (chapter.resolvedClueIds) {
        chapter.resolvedClueIds.forEach(id => resolvedIds.add(id));
      }
    }

    // 收集所有待回填的伏笔
    for (const chapter of chapters) {
      if (chapter.clues) {
        for (const clue of chapter.clues) {
          if (clue.status === 'pending' && !resolvedIds.has(clue.id)) {
            allClues.push({
              ...clue,
              chapterNumber: chapter.chapterNumber
            });
          }
        }
      }
    }

    return allClues;
  }

  /**
   * 清理 content 中重复的标题和简介
   * LLM 有时会在 content 开头重复输出标题和简介，需要移除
   */
  private cleanContent(content: string, title: string, summary: string): string {
    let cleaned = content;

    // 移除 Markdown 标题（# 或 ##）
    cleaned = cleaned.replace(/^##?\s+.*$/m, '').trim();

    // 移除"章节简介"部分（如果存在）
    cleaned = cleaned.replace(/\*\*章节简介\*\*[：:]\s*.*$/m, '').trim();

    // 移除标题文本（精确匹配）
    if (cleaned.startsWith(title)) {
      cleaned = cleaned.substring(title.length).trim();
    }

    // 移除简介文本（精确匹配，前50字）
    const summaryPrefix = summary.substring(0, Math.min(50, summary.length));
    if (cleaned.includes(summaryPrefix)) {
      cleaned = cleaned.replace(summaryPrefix, '').trim();
    }

    // 移除开头的分隔线
    cleaned = cleaned.replace(/^[-—=]+\s*/m, '').trim();

    // 移除末尾的伏笔说明（已提取到结构化数据）
    cleaned = cleaned.replace(/\n+\*\*本章伏笔\*\*[\s\S]*$/m, '').trim();
    cleaned = cleaned.replace(/\n+\*\*人物弧光\*\*[\s\S]*$/m, '').trim();
    cleaned = cleaned.replace(/\n+\*\*情节推进\*\*[\s\S]*$/m, '').trim();

    return cleaned;
  }

  /**
   * 工具方法：为长篇小说场景提供上下文检索能力
   *
   * 设计理念：
   * - 短篇小说（<10章）：直接在提示词中包含所有章节（当前默认方式）
   * - 长篇小说（50+章）：提供工具让 LLM 按需查询，避免 token 溢出
   *
   * 使用场景：
   * 1. 章节数量超过 10 章时，可启用工具模式
   * 2. LLM 可以主动搜索前文相关内容，而不是被动接收所有章节
   * 3. 提升长篇连载的一致性和召回能力
   */
  private createStoryTools(chapters: ChapterData[]) {
    const listChaptersTool = tool(
      async () => {
        console.log(`call tool listChaptersTool`)
        return JSON.stringify(
          chapters.map(ch => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            summary: ch.summary
          })),
          null,
          2
        );
      },
      {
        name: 'list_chapters',
        description: '列出所有已创作章节的标题和简介',
        schema: z.object({})
      }
    );

    const retrieveChapterTool = tool(
      async ({ chapterNumber }: { chapterNumber: number }) => {
        console.log(`call tool retrieveChapterTool ${chapterNumber}`)
        const chapter = chapters.find(c => c.chapterNumber === chapterNumber);
        if (!chapter) {
          return `章节 ${chapterNumber} 不存在`;
        }
        return JSON.stringify(chapter, null, 2);
      },
      {
        name: 'retrieve_chapter',
        description: '检索特定章节的完整内容（包括标题、简介、正文）',
        schema: z.object({
          chapterNumber: z.number().describe('章节号')
        })
      }
    );

    const searchContentTool = tool(
      async ({ pattern, mode }: { pattern: string; mode?: 'literal' | 'regex' | 'glob' }) => {
        console.log(`call tool searchContentTool pattern=${pattern} mode=${mode || 'literal'}`)

        const searchMode = mode || 'literal';
        let matcher: (text: string) => { matched: boolean; matches?: RegExpMatchArray[] };

        try {
          if (searchMode === 'regex') {
            // 正则表达式模式
            const regex = new RegExp(pattern, 'gi');
            matcher = (text: string) => {
              const matches = Array.from(text.matchAll(new RegExp(pattern, 'gi')));
              return { matched: matches.length > 0, matches };
            };
          } else if (searchMode === 'glob') {
            // Glob 模式：转换为正则表达式
            // * → .*    ? → .    其他字符转义
            const regexPattern = pattern
              .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // 转义特殊字符
              .replace(/\*/g, '.*')                   // * → .*
              .replace(/\?/g, '.');                   // ? → .
            const regex = new RegExp(regexPattern, 'gi');
            matcher = (text: string) => {
              const matches = Array.from(text.matchAll(regex));
              return { matched: matches.length > 0, matches };
            };
          } else {
            // 字面量模式（向后兼容）
            matcher = (text: string) => {
              const index = text.indexOf(pattern);
              return {
                matched: index !== -1,
                matches: index !== -1 ? [{ 0: pattern, index, input: text }] as any : undefined
              };
            };
          }

          const results = chapters
            .map(ch => {
              const contentMatch = matcher(ch.content);
              const titleMatch = matcher(ch.title);
              const summaryMatch = matcher(ch.summary);

              const matched = contentMatch.matched || titleMatch.matched || summaryMatch.matched;

              if (!matched) return null;

              return {
                chapterNumber: ch.chapterNumber,
                title: ch.title,
                matchCount: (contentMatch.matches?.length || 0) + (titleMatch.matches?.length || 0) + (summaryMatch.matches?.length || 0),
                matchLocations: {
                  title: titleMatch.matched ? titleMatch.matches?.map(m => m[0]) : [],
                  summary: summaryMatch.matched ? summaryMatch.matches?.map(m => m[0]) : [],
                  content: contentMatch.matched ? contentMatch.matches?.slice(0, 5).map(m => m[0]) : []  // 最多返回5个内容匹配
                },
                matchContext: this.extractContextForMatches(ch.content, contentMatch.matches || [])
              };
            })
            .filter(r => r !== null);

          if (results.length === 0) {
            return `未找到匹配模式 "${pattern}" (${searchMode} 模式) 的内容`;
          }

          return JSON.stringify(results, null, 2);
        } catch (error: any) {
          return `搜索失败：${error.message}`;
        }
      },
      {
        name: 'search_content',
        description: '在前文所有章节中搜索内容，支持多种模式：literal（字面量）、regex（正则表达式）、glob（通配符）',
        schema: z.object({
          pattern: z.string().describe('搜索模式。literal: 字面量匹配；regex: 正则表达式（如 "师父.*青玉"）；glob: 通配符（如 "*师父*", "青玉?"）'),
          mode: z.enum(['literal', 'regex', 'glob']).optional().describe('搜索模式，默认为 literal')
        })
      }
    );

    return [listChaptersTool, retrieveChapterTool, searchContentTool];
  }

  /**
   * 提取关键词上下文（用于搜索工具）
   */
  private extractContext(text: string, keyword: string, contextLength: number = 100): string {
    const index = text.indexOf(keyword);
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + keyword.length + contextLength);

    return `...${text.substring(start, end)}...`;
  }

  /**
   * 提取多个匹配项的上下文（用于正则/glob搜索）
   */
  private extractContextForMatches(text: string, matches: RegExpMatchArray[], contextLength: number = 100): string[] {
    if (!matches || matches.length === 0) return [];

    // 最多返回前3个匹配的上下文
    return matches.slice(0, 3).map(match => {
      const index = match.index || 0;
      const matchText = match[0];
      const start = Math.max(0, index - contextLength);
      const end = Math.min(text.length, index + matchText.length + contextLength);

      return `...${text.substring(start, end)}...`;
    });
  }
}
