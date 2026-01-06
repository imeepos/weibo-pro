import { Injectable } from '@sker/core';
import { Handler, NodeEvent, WorkflowGraphAst, setAstError } from '@sker/workflow';
import { EventAuthGenerateAst } from '@sker/workflow-ast';
import {
  useEntityManager,
  EventEntity,
  EventCategoryEntity,
  type SentimentScore
} from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { useLlmModel } from './llm-client';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { ErrorHandlerOperators } from './utils/error-handler.util';

interface LLMGeneratedEvent {
  title: string;
  description?: string;
  category_id: string;
  sentiment?: SentimentScore;
  hotness?: number;
  status?: 'active' | 'inactive' | 'archived';
  seed_url?: string;
  occurred_at?: string;
  peak_at?: string;
  reasoning?: string;
  alreadyExists?: boolean;
  existingEventId?: string;
}

@Injectable()
export class EventAuthGenerateAstVisitor {

  private readonly DEFAULT_SYSTEM_PROMPT = `你是一个微博舆情事件生成专家。你的任务是根据用户提供的信息，生成符合数据库结构的事件记录。

## 核心原则

1. **数据完整性**：必须生成所有必填字段（title, category_id, sentiment）
2. **智能补全**：根据用户输入合理推断缺失的信息
3. **去重判断**：判断是否应该生成新事件，还是忽略已存在的类似事件
4. **分类准确性**：选择最合适的 category_id

## 输出格式（严格 JSON）

请严格按照以下 JSON 格式输出，不要输出其他内容：

\`\`\`json
{
  "title": "事件标题（必填，255字符以内）",
  "description": "事件详细描述（可选，text类型）",
  "category_id": "事件分类的 UUID（必填，需从可用分类中选择）",
  "sentiment": {
    "positive": 0.0,
    "negative": 0.0,
    "neutral": 0.0
  },
  "hotness": 0.0,
  "status": "active",
  "seed_url": null,
  "occurred_at": "ISO 8601格式时间戳或null",
  "peak_at": "ISO 8601格式时间戳或null",
  "reasoning": "生成理由（用于日志记录）",
  "alreadyExists": false,
  "existingEventId": null
}
\`\`\`

## 字段说明

- **title**：简洁的事件标题，如"腾讯回应元宝AI辱骂用户"，必填
- **description**：事件背景、经过、影响等详细说明，可选
- **category_id**：必须从【可用分类列表】中选择最合适的 UUID，必填
- **sentiment**：情感分析（正负中立概率，总和为1.0）
  - positive: 正面情感概率（0-1）
  - negative: 负面情感概率（0-1）
  - neutral: 中立情感概率（0-1）
- **hotness**：热度评分（0-100），基于阅读数、讨论量等综合计算
- **status**：事件状态，默认为"active"
- **seed_url**：事件源链接（如有）
- **occurred_at**：事件发生时间（ISO 8601格式或null）
- **peak_at**：热度峰值时间（ISO 8601格式或null）
- **reasoning**：解释为什么生成这个事件，以及如何选择各个字段
- **alreadyExists**：如果认为已存在高度相似的事件，设为 true
- **existingEventId**：如果已存在相似事件，填写该事件的 ID（如果已知）

## 去重策略

在生成事件前，请分析：
1. 用户输入的事件是否可能与现有事件高度相似？
2. 判断标准：标题相似度高（关键词重合度>50%）、时间接近（24小时内）
3. 如果判断为相似事件，设置 alreadyExists: true，并在 reasoning 中说明理由
4. 否则，生成新事件并在 reasoning 中说明生成理由

## 情感分析指南

根据事件内容分析情感倾向：
- **正面事件**：如企业新产品发布、政策利好、成功案例等，positive 可设为 0.6-0.8
- **负面事件**：如产品质量问题、企业丑闻、用户投诉等，negative 可设为 0.6-0.8
- **中性事件**：如常规新闻、行业动态等，neutral 可设为 0.6-0.8
- **混合事件**：如争议性话题，可以三值平衡或根据主要倾向分配

## 热度计算指南

根据用户输入的指标计算热度（0-100）：
- 阅读数：100万以下约10-30分，100-500万约30-60分，500万以上约60-100分
- 讨论量：1000以下约0-10分，1000-10000约10-30分，10000以上约30-50分
- 原创数：100以下约0-10分，100-1000约10-20分，1000以上约20-30分
- 综合评分 = 阅读分 + 讨论分 + 原创分（最高100分）`;

  @Handler(EventAuthGenerateAst)
  visit(ast: EventAuthGenerateAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      ast.emitCount = 0;
      ast.insertSuccess = false;
      ast.alreadyExists = false;
      ast.errorMessage = '';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData): Promise<NodeEvent[]> => {
          ast.emitCount += 1;
          console.log('[EventAuthGenerateAstVisitor] 处理第', ast.emitCount, '次输入');
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          try {
            // 合并输入数据到 AST
            if (inputData) {
              Object.keys(inputData).forEach(key => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }

            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            // 验证输入
            if (!ast.userInput || typeof ast.userInput !== 'string') {
              throw new Error('用户输入数据不能为空');
            }

            // 解析用户输入的 JSON
            let userInputData: Record<string, any>;
            try {
              userInputData = JSON.parse(ast.userInput);
            } catch (parseError) {
              throw new Error(`用户输入 JSON 解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }

            // 构建系统提示词（包含可用分类列表）
            const availableCategories = await this.fetchAvailableCategories();
            const categoryList = availableCategories.map(cat =>
              `- ${cat.name} (ID: ${cat.id}, 编码: ${cat.code})${cat.description ? `: ${cat.description}` : ''}`
            ).join('\n');

            const systemPrompt = ast.systemPromptTemplate && ast.systemPromptTemplate.trim()
              ? ast.systemPromptTemplate
              : this.DEFAULT_SYSTEM_PROMPT;

            const enhancedSystemPrompt = `${systemPrompt}

## 可用事件分类列表

${categoryList}

**请根据事件内容，从上述分类中选择最合适的一个，使用其 UUID 作为 category_id。**`;

            // 构建用户提示词
            const userPrompt = this.buildUserPrompt(userInputData);

            // 调用 LLM
            const llmModel = useLlmModel({ model: ast.model, temperature: ast.temperature });
            const response = await llmModel.invoke([
              { role: 'system', content: enhancedSystemPrompt },
              { role: 'user', content: userPrompt }
            ]);

            const responseContent = typeof response.content === 'string'
              ? response.content
              : JSON.stringify(response.content);

            console.log('[EventAuthGenerateAstVisitor] LLM 响应:', responseContent.substring(0, 200));

            // 解析 LLM 返回的 JSON
            const generatedEvent = this.parseLLMResponse(responseContent);

            // 验证必填字段
            this.validateGeneratedEvent(generatedEvent, availableCategories);

            // 如果 LLM 判断已存在相似事件
            if (generatedEvent.alreadyExists && !ast.forceInsert) {
              console.log('[EventAuthGenerateAstVisitor] LLM 判断已存在相似事件，跳过插入');
              ast.alreadyExists = true;

              // 如果 LLM 提供了已存在的事件 ID，尝试查询
              let existingEvent: EventEntity | null = null;
              if (generatedEvent.existingEventId) {
                existingEvent = await this.findEventById(generatedEvent.existingEventId);
              }

              // 如果没有找到，尝试通过相似度查找
              if (!existingEvent) {
                existingEvent = await this.findSimilarEvent(generatedEvent);
              }

              if (existingEvent) {
                ast.event = existingEvent;
                ast.event_id = existingEvent.id;
                ast.event_title = existingEvent.title;

                return [{
                  type: 'node_emit' as const,
                  id: ast.id,
                  data: {
                    event: existingEvent,
                    event_id: existingEvent.id,
                    event_title: existingEvent.title,
                    insertSuccess: false,
                    alreadyExists: true,
                    errorMessage: ''
                  }
                }];
              }

              // 没有找到已存在事件，继续生成新事件
              console.log('[EventAuthGenerateAstVisitor] 未找到已存在事件，继续生成新事件');
            }

            // 插入数据库
            const insertedEvent = await this.insertEventToDatabase(generatedEvent);

            ast.insertSuccess = true;
            ast.event = insertedEvent;
            ast.event_id = insertedEvent.id;
            ast.event_title = insertedEvent.title;

            console.log('[EventAuthGenerateAstVisitor] 事件插入成功:', insertedEvent.id);

            return [{
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                event: insertedEvent,
                event_id: insertedEvent.id,
                event_title: insertedEvent.title,
                insertSuccess: true,
                alreadyExists: false,
                errorMessage: ''
              }
            }];

          } catch (error: any) {
            console.error('[EventAuthGenerateAstVisitor] ❌ 处理失败');
            console.error('  错误:', error?.message);
            console.error('  堆栈:', error?.stack);

            ast.errorMessage = error?.message || String(error);

            return [{
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                event: null,
                event_id: '',
                event_title: '',
                insertSuccess: false,
                alreadyExists: false,
                errorMessage: ast.errorMessage
              }
            }];
          }
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[EventAuthGenerateAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[EventAuthGenerateAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.errorMessage || error?.message });
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        console.log('[EventAuthGenerateAstVisitor] 订阅被取消，触发 AbortSignal');
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(userInputData: Record<string, any>): string {
    const formattedInput = JSON.stringify(userInputData, null, 2);

    return `请根据以下用户提供的信息，生成符合数据库结构的事件记录：

## 用户输入

${formattedInput}

## 任务要求

1. 分析用户输入，提取关键信息
2. 合理推断缺失的字段（如 description, sentiment, hotness 等）
3. 从可用分类列表中选择最合适的 category_id
4. 判断是否应该生成新事件（检查是否与现有事件高度相似）
5. 返回完整的 JSON 格式事件记录

请开始处理：`;
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(responseContent: string): LLMGeneratedEvent {
    // 尝试提取 JSON（可能包裹在 ```json ``` 中）
    const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1]!.trim() : responseContent.trim();

    // 使用 json-harmony 解析（容错性强）
    const parseResult = parseWithHarmony(jsonStr);

    if (typeof parseResult.data !== 'object' || parseResult.data === null) {
      throw new Error('LLM 返回的 JSON 格式无效');
    }

    return parseResult.data as LLMGeneratedEvent;
  }

  /**
   * 验证生成的事件数据
   */
  private validateGeneratedEvent(
    event: LLMGeneratedEvent,
    availableCategories: EventCategoryEntity[]
  ): void {
    // 验证必填字段
    if (!event.title || typeof event.title !== 'string') {
      throw new Error('事件标题缺失或无效');
    }

    if (event.title.length > 255) {
      throw new Error('事件标题超过255字符限制');
    }

    if (!event.category_id || typeof event.category_id !== 'string') {
      throw new Error('category_id 缺失或无效');
    }

    // 验证 category_id 是否在可用列表中
    const categoryExists = availableCategories.some(cat => cat.id === event.category_id);
    if (!categoryExists) {
      throw new Error(`category_id "${event.category_id}" 不在可用分类列表中`);
    }

    // 验证 sentiment
    if (event.sentiment) {
      const { positive = 0, negative = 0, neutral = 0 } = event.sentiment;
      const sum = positive + negative + neutral;
      if (Math.abs(sum - 1.0) > 0.1) {
        console.warn('[EventAuthGenerateAstVisitor] sentiment 概率总和不为1.0，将自动归一化');
      }
    }

    // 验证日期格式
    if (event.occurred_at && isNaN(Date.parse(event.occurred_at))) {
      throw new Error('occurred_at 日期格式无效');
    }

    if (event.peak_at && isNaN(Date.parse(event.peak_at))) {
      throw new Error('peak_at 日期格式无效');
    }
  }

  /**
   * 通过 ID 查找事件
   */
  private async findEventById(eventId: string): Promise<EventEntity | null> {
    return await useEntityManager(async (manager) => {
      return await manager.findOne(EventEntity, { where: { id: eventId } });
    });
  }

  /**
   * 查找相似事件（去重）
   */
  private async findSimilarEvent(event: LLMGeneratedEvent): Promise<EventEntity | null> {
    return await useEntityManager(async (manager) => {
      // 查找标题相似的事件（使用简单的模糊匹配）
      const events = await manager.find(EventEntity, {
        where: { status: 'active' },
        order: { created_at: 'DESC' },
        take: 100 // 只检查最近100个事件
      });

      // 简单相似度检查：标题包含相同的关键词
      const keywords = event.title.split(/[\s,，。]+/).filter(w => w.length > 2);

      for (const existingEvent of events) {
        let matchCount = 0;
        for (const keyword of keywords) {
          if (existingEvent.title.includes(keyword)) {
            matchCount++;
          }
        }

        // 如果有50%以上的关键词匹配，认为是相似事件
        if (keywords.length > 0 && matchCount >= keywords.length * 0.5) {
          console.log(`[EventAuthGenerateAstVisitor] 发现相似事件: ${existingEvent.id} - ${existingEvent.title}`);
          return existingEvent;
        }
      }

      return null;
    });
  }

  /**
   * 插入事件到数据库
   */
  private async insertEventToDatabase(generatedEvent: LLMGeneratedEvent): Promise<EventEntity> {
    return await useEntityManager(async (manager) => {
      // 归一化 sentiment
      let sentiment: SentimentScore;
      if (generatedEvent.sentiment) {
        const { positive = 0, negative = 0, neutral = 0 } = generatedEvent.sentiment;
        const sum = positive + negative + neutral || 1;
        sentiment = {
          positive: sum > 0 ? positive / sum : 0.33,
          negative: sum > 0 ? negative / sum : 0.33,
          neutral: sum > 0 ? neutral / sum : 0.34
        };
      } else {
        // 默认中立情感
        sentiment = { positive: 0.33, negative: 0.33, neutral: 0.34 };
      }

      // 构建事件实体
      const eventEntity = new EventEntity();
      eventEntity.title = generatedEvent.title;
      eventEntity.description = generatedEvent.description || null;
      eventEntity.category_id = generatedEvent.category_id;
      eventEntity.sentiment = sentiment;
      eventEntity.hotness = generatedEvent.hotness ?? 0;
      eventEntity.status = generatedEvent.status || 'active';
      eventEntity.seed_url = generatedEvent.seed_url || null;
      eventEntity.occurred_at = generatedEvent.occurred_at ? new Date(generatedEvent.occurred_at) : null;
      eventEntity.peak_at = generatedEvent.peak_at ? new Date(generatedEvent.peak_at) : null;

      // 保存到数据库
      const savedEvent = await manager.save(EventEntity, eventEntity);

      console.log('[EventAuthGenerateAstVisitor] 事件已保存到数据库:', savedEvent.id);
      return savedEvent;
    });
  }

  /**
   * 获取可用的事件分类列表
   */
  private async fetchAvailableCategories(): Promise<EventCategoryEntity[]> {
    return await useEntityManager(async (manager) => {
      return await manager.find(EventCategoryEntity, {
        where: { status: 'active' },
        order: { sort: 'ASC', name: 'ASC' }
      });
    });
  }
}
