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
  category_name?: string; // LLM 提供的分类中文名称
  sentiment?: SentimentScore;
  hotness?: number;
  status?: 'active' | 'inactive' | 'archived';
  seed_url?: string;
  occurred_at?: string;
  peak_at?: string;
  keywords?: string[];
  reasoning?: string;
  alreadyExists?: boolean;
  existingEventId?: string;
}

@Injectable()
export class EventAuthGenerateAstVisitor {

  private readonly DEFAULT_SYSTEM_PROMPT = `你是一个微博舆情事件生成专家。你的任务是根据用户提供的信息，生成符合数据库结构的事件记录。

## 核心原则

1. **数据完整性**：必须生成所有必填字段（title, category_id, sentiment, keywords）
2. **智能补全**：根据用户输入合理推断缺失的信息
3. **去重判断**：判断是否应该生成新事件，还是忽略已存在的类似事件
4. **分类准确性**：选择最合适的 category_id

## 输出格式（严格 JSON）

请严格按照以下 JSON 格式输出，不要输出其他内容：

\`\`\`json
{
  "title": "事件标题（必填，255字符以内）",
  "description": "事件详细描述（可选，text类型）",
  "category_id": "分类编码（必填，snake_case格式）",
  "category_name": "分类中文名称（必填，如：科技互联网、社会民生）",
  "sentiment": {
    "positive": 0.0,
    "negative": 0.0,
    "neutral": 0.0
  },
  "hotness": 0.0,
  "status": "active",
  "seed_url": null,
  "occurred_at": "2026-01-04 16:54:00",
  "peak_at": "2026-01-04 18:00:00",
  "keywords": ["关键词1", "关键词2"],
  "reasoning": "生成理由（用于日志记录）",
  "alreadyExists": false,
  "existingEventId": null
}
\`\`\`

## 字段说明

- **title**：事件标题（必填，20字以内）

<title-rules>
  <principle>主体+动作，一眼看懂发生了什么</principle>
  <good-examples>
    <example>杨振宁逝世</example>
    <example>王暖暖离婚案宣判</example>
    <example>小红书被立案调查</example>
    <example>春秋航空招聘已婚已育空嫂</example>
  </good-examples>
  <forbidden>
    <item>媒体名称（人民日报主持、央视新闻曝光）</item>
    <item>话题符号（#xxx#）</item>
  </forbidden>
</title-rules>
- **description**：事件核心事实（可选）

<description-rules>
  <principle>一句话说清核心事实，不要评价，只陈述</principle>

  <requirements>
    <item>50字以内，最多不超过100字</item>
    <item>包含核心5W：谁(Who)、做了什么(What)、结果(Result)</item>
    <item>直接陈述事实，不加修饰语</item>
  </requirements>

  <forbidden>
    <item>"据报道"、"该事件涉及"、"引发全网关注"等套话</item>
    <item>"具有重要意义"、"性质恶劣"等评价性语言</item>
    <item>阅读量、讨论量等数据（这些放在hotness字段）</item>
    <item>重复标题内容</item>
  </forbidden>

  <good-examples>
    <example title="泰国孕妇坠崖案离婚宣判">王暖暖离婚案宣判，法院判决离婚</example>
    <example title="新疆沙漠发现盐水丰年虾">科研人员在塔克拉玛干沙漠首次发现该物种</example>
    <example title="小红书被查">小红书因内容违规被监管部门立案调查</example>
  </good-examples>

  <bad-examples>
    <example reason="套话+评价">据报道，该事件涉及...引发全网对...的广泛关注</example>
    <example reason="重复+冗余">该事件标志着...体现了...具有重要意义</example>
  </bad-examples>
</description-rules>

- **category_id**：分类编码（必填），使用 snake_case 格式

<category-rules>
  <principle>根据事件内容选择最合适的分类，若现有分类不合适可创建新分类</principle>

  <existing-categories>优先从【可用分类列表】中选择</existing-categories>

  <common-categories>
    <!-- 行业类 -->
    agriculture(农林牧渔)、mining(采矿业)、manufacturing(制造业)、
    energy_utility(电力热力燃气水务)、construction(建筑业)、
    retail_wholesale(批发零售)、transportation(交通运输仓储邮政)、
    hospitality(住宿餐饮)、tech_internet(信息技术互联网)、
    finance(金融业)、real_estate(房地产)、business_service(商务服务)、
    science_research(科研技术服务)、environment(环境公共设施)、
    life_service(居民服务)、education(教育)、health_social(卫生社会工作)、
    culture_sports(文化体育娱乐)、public_admin(公共管理社会组织)、
    international_org(国际组织)
    <!-- 舆情特有类 -->
    politics(政治)、military(军事)、legal(法律司法)、
    disaster(灾害事故)、celebrity(明星名人)、social(社会民生)
  </common-categories>

  <create-new>若以上都不合适，可创建新编码（snake_case格式，如：public_safety、celebrity_news）</create-new>

  <forbidden>禁止使用 UUID 格式作为分类编码</forbidden>
</category-rules>

- **sentiment**：情感分析（正负中立概率，总和为1.0）
  - positive: 正面情感概率（0-1）
  - negative: 负面情感概率（0-1）
  - neutral: 中立情感概率（0-1）
- **hotness**：热度评分（0-100），基于阅读数、讨论量等综合计算
- **status**：事件状态，默认为"active"
- **seed_url**：事件源链接（如有）
- **occurred_at**：事件发生时间，**必须从用户输入中提取**（如 onboard_time、time、created_at 等字段），格式：YYYY-MM-DD HH:mm:ss
- **peak_at**：热度峰值时间，格式同上，可与 occurred_at 相同
- **keywords**：微博搜索关键词（2-3个）

<keyword-rules>
  <principle>提取最精准的微博搜索关键词，优先使用话题格式</principle>

  <topic-format>
    <rule>如果用户输入包含 #话题# 格式，必须保留完整格式（包括 # 符号）</rule>
    <reason>微博话题使用 #话题# 包裹，这是最精准的检索方式</reason>
    <example input="#携程涉嫌垄断# @市说新语 携程作为...">["#携程涉嫌垄断#"]</example>
    <example input="#杨振宁逝世# 著名物理学家...">["#杨振宁逝世#"]</example>
  </topic-format>

  <structure>
    <slot name="话题">优先提取 #话题#（如：#携程涉嫌垄断#、#杨振宁逝世#）</slot>
    <slot name="主体">人名/品牌/产品（如：携程、杨振宁、元宝AI）</slot>
    <slot name="动作">发生了什么（如：垄断、逝世、骂人、被查）</slot>
  </structure>

  <good-examples>
    <example event="携程涉嫌垄断" input="#携程涉嫌垄断# @市说新语...">["#携程涉嫌垄断#", "携程"]</example>
    <example event="腾讯AI骂人" input="腾讯元宝AI骂人事件">["元宝AI", "骂人"]</example>
    <example event="泰国坠崖案" input="#王暖暖坠崖案# 宣判">["#王暖暖坠崖案#", "王暖暖"]</example>
  </good-examples>

  <forbidden>
    <category name="媒体名">央视新闻、人民日报、新华社、红星新闻、观察者网</category>
    <category name="抽象标签">社会民生、正能量、国家认同、文化展示、科研成就、生物多样性、互联网合规、平台监管、内容审核、AI安全、公共安全、校园安全、两岸关系、国际外交、太空探索、科学界、教育温情、国际法、师德师风、消费者权益</category>
    <category name="学术词汇">舆情、传播、倾向、监管、合规</category>
  </forbidden>
</keyword-rules>
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
            let userInputString: string;
            if (typeof ast.userInput === 'string' && ast.userInput.trim()) {
              userInputString = ast.userInput;
            } else if (ast.userInput && typeof ast.userInput === 'object') {
              // 自动将对象转换为 JSON 字符串
              userInputString = JSON.stringify(ast.userInput);
            } else {
              throw new Error('用户输入数据不能为空');
            }

            // 解析用户输入的 JSON
            let userInputData: Record<string, any>;
            try {
              userInputData = JSON.parse(userInputString);
            } catch (parseError) {
              throw new Error(`用户输入 JSON 解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }

            // 构建系统提示词（包含可用分类列表和现有事件列表）
            const availableCategories = await this.fetchAvailableCategories();
            const categoryList = availableCategories.map(cat =>
              `- ${cat.name} (ID: ${cat.id}, 编码: ${cat.code})${cat.description ? `: ${cat.description}` : ''}`
            ).join('\n');

            // 获取最近的事件列表用于去重
            const recentEvents = await this.fetchRecentEvents();
            const eventListText = recentEvents.length > 0
              ? recentEvents.map((e, idx) =>
                  `${idx + 1}. ID: ${e.id}\n   标题: ${e.title}\n   描述: ${e.description || '无'}\n   创建时间: ${e.created_at.toLocaleString('zh-CN')}`
                ).join('\n\n')
              : '暂无现有事件';

            const systemPrompt = ast.systemPromptTemplate && ast.systemPromptTemplate.trim()
              ? ast.systemPromptTemplate
              : this.DEFAULT_SYSTEM_PROMPT;

            const enhancedSystemPrompt = `${systemPrompt}

## 可用事件分类列表

${categoryList}

**请根据事件内容，从上述分类中选择最合适的一个，使用其 UUID 作为 category_id。**

## 现有事件列表（用于去重判断）

${eventListText}

**请仔细检查新事件是否与现有事件高度相似。如果相似，设置 alreadyExists: true 并填写 existingEventId。**`;

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
            await this.validateGeneratedEvent(generatedEvent, availableCategories);

            // 处理去重逻辑
            if (!ast.forceInsert) {
              let existingEvent: EventEntity | null = null;

              // 优先使用 LLM 判断的结果
              if (generatedEvent.alreadyExists && generatedEvent.existingEventId) {
                console.log('[EventAuthGenerateAstVisitor] LLM 判断已存在相似事件:', generatedEvent.existingEventId);

                // 验证 UUID 格式后再查询
                if (this.isValidUUID(generatedEvent.existingEventId)) {
                  existingEvent = await this.findEventById(generatedEvent.existingEventId);
                } else {
                  console.warn('[EventAuthGenerateAstVisitor] LLM 返回的事件 ID 格式无效，跳过 ID 查询');
                }

                // 如果 LLM 返回的 ID 无效或找不到，使用传统方法二次确认
                if (!existingEvent) {
                  console.warn('[EventAuthGenerateAstVisitor] 使用关键词匹配方法验证');
                  existingEvent = this.findSimilarEventByKeywords(generatedEvent, recentEvents);
                }
              }

              // 如果 LLM 没有判断为重复，使用传统方法兜底检查
              if (!existingEvent) {
                existingEvent = this.findSimilarEventByKeywords(generatedEvent, recentEvents);
              }

              // 如果找到相似事件，检查是否需要更新属性
              if (existingEvent) {
                console.log('[EventAuthGenerateAstVisitor] 发现相似事件:', existingEvent.id);

                // 更新现有事件的属性（如果 LLM 生成的更合理）
                const updatedEvent = await this.updateEventIfNeeded(existingEvent, generatedEvent);

                ast.alreadyExists = true;
                ast.event = updatedEvent;
                ast.event_id = updatedEvent.id;
                ast.event_title = updatedEvent.title;

                return [{
                  type: 'node_emit' as const,
                  id: ast.id,
                  data: {
                    event: updatedEvent,
                    event_id: updatedEvent.id,
                    event_title: updatedEvent.title,
                    insertSuccess: false,
                    alreadyExists: true,
                    errorMessage: ''
                  }
                }];
              }
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
2. **时间提取**：从用户输入中提取事件发生时间（如 onboard_time、time、created_at 等字段），作为 occurred_at
3. 合理推断缺失的字段（如 description, sentiment, hotness 等）
4. 从可用分类列表中选择最合适的 category_id
5. 判断是否应该生成新事件（检查是否与现有事件高度相似）
6. 返回完整的 JSON 格式事件记录

请开始处理：`;
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(responseContent: string): LLMGeneratedEvent {
    // 使用 json-harmony 解析（容错性强）
    const parseResult = parseWithHarmony(responseContent);

    if (typeof parseResult.data !== 'object' || parseResult.data === null) {
      console.error('[EventAuthGenerateAstVisitor] JSON 解析失败，原始文本:');
      console.error(responseContent);
      throw new Error('LLM 返回的 JSON 格式无效');
    }

    return parseResult.data as LLMGeneratedEvent;
  }

  /**
   * 验证生成的事件数据
   */
  private async validateGeneratedEvent(
    event: LLMGeneratedEvent,
    availableCategories: EventCategoryEntity[]
  ): Promise<void> {
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

    // 验证并解析 category_id
    const resolvedCategoryId = await this.resolveOrCreateCategory(
      event.category_id,
      availableCategories,
      event.category_name
    );
    event.category_id = resolvedCategoryId;

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
   * 获取最近的事件列表
   */
  private async fetchRecentEvents(): Promise<EventEntity[]> {
    return await useEntityManager(async (manager) => {
      return await manager.find(EventEntity, {
        where: { status: 'active' },
        order: { created_at: 'DESC' },
        take: 30, // 取最近 30 个事件
        select: ['id', 'title', 'description', 'created_at']
      });
    });
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
   * 传统关键词匹配去重（兜底方案）
   */
  private findSimilarEventByKeywords(event: LLMGeneratedEvent, existingEvents: EventEntity[]): EventEntity | null {
    const normalizedTitle = event.title.trim().toLowerCase();

    for (const existingEvent of existingEvents) {
      const existingTitle = existingEvent.title.trim().toLowerCase();

      // 1. 精确匹配（忽略大小写和前后空格）
      if (normalizedTitle === existingTitle) {
        console.log(`[EventAuthGenerateAstVisitor] 发现完全相同事件: ${existingEvent.id} - ${existingEvent.title}`);
        return existingEvent;
      }

      // 2. 相似度检查：标题包含相同的关键词
      const keywords = event.title.split(/[\s,，。]+/).filter(w => w.length > 2);
      if (keywords.length > 0) {
        let matchCount = 0;
        for (const keyword of keywords) {
          if (existingEvent.title.includes(keyword)) {
            matchCount++;
          }
        }

        // 如果有50%以上的关键词匹配，认为是相似事件
        if (matchCount >= keywords.length * 0.5) {
          console.log(`[EventAuthGenerateAstVisitor] 发现相似事件: ${existingEvent.id} - ${existingEvent.title}`);
          return existingEvent;
        }
      }
    }

    return null;
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
      eventEntity.occurred_at = this.parseBeijingTime(generatedEvent.occurred_at);
      eventEntity.peak_at = this.parseBeijingTime(generatedEvent.peak_at);
      eventEntity.keywords = generatedEvent.keywords || [];

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

  /**
   * 解析或创建分类，返回有效的 category_id (UUID)
   */
  private async resolveOrCreateCategory(
    categoryIdOrCode: string,
    availableCategories: EventCategoryEntity[],
    categoryName?: string
  ): Promise<string> {
    // 1. 尝试通过 UUID 匹配现有分类
    const categoryById = availableCategories.find(cat => cat.id === categoryIdOrCode);
    if (categoryById) {
      return categoryById.id;
    }

    // 2. 尝试通过编码（code）匹配现有分类
    const categoryByCode = availableCategories.find(cat => cat.code === categoryIdOrCode);
    if (categoryByCode) {
      console.log(`[EventAuthGenerateAstVisitor] 自动修正 category_id: "${categoryIdOrCode}" -> "${categoryByCode.id}"`);
      return categoryByCode.id;
    }

    // 3. 检查是否是 UUID 格式（UUID 不能作为分类编码）
    if (this.isValidUUID(categoryIdOrCode)) {
      console.warn(`[EventAuthGenerateAstVisitor] LLM 返回了无效的 UUID 作为分类: "${categoryIdOrCode}"，使用默认分类 "other"`);
      const otherCategory = await this.createCategory('other', '其他');
      return otherCategory.id;
    }

    // 4. 合法的分类编码，自动创建新分类
    console.log(`[EventAuthGenerateAstVisitor] 分类 "${categoryIdOrCode}" 不存在，自动创建...`);
    const newCategory = await this.createCategory(categoryIdOrCode, categoryName);
    return newCategory.id;
  }

  /**
   * 创建新分类
   */
  private async createCategory(code: string, name?: string): Promise<EventCategoryEntity> {
    return await useEntityManager(async (manager) => {
      // 先检查是否已存在（防止并发创建）
      const existing = await manager.findOne(EventCategoryEntity, { where: { code } });
      if (existing) {
        return existing;
      }

      const category = new EventCategoryEntity();
      category.code = code;
      category.name = name || this.generateCategoryName(code);
      category.name_en = code;
      category.status = 'active';
      category.sort = 100;

      const saved = await manager.save(EventCategoryEntity, category);
      console.log(`[EventAuthGenerateAstVisitor] 新分类已创建: ${saved.id} (${saved.code} - ${saved.name})`);
      return saved;
    });
  }

  /**
   * 根据 code 生成中文分类名称（简单转换，主要依赖 LLM 判断）
   */
  private generateCategoryName(code: string): string {
    // 将 snake_case 转为可读格式
    return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * 验证 UUID 格式
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * 解析北京时间字符串为 Date 对象
   * 支持格式：YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DDTHH:mm:ss
   */
  private parseBeijingTime(timeStr: string | undefined | null): Date | null {
    if (!timeStr) return null;

    // 如果已经带时区信息，直接解析
    if (timeStr.includes('+') || timeStr.endsWith('Z')) {
      return new Date(timeStr);
    }

    // 简单格式，按北京时间（UTC+8）处理
    // 将 "2026-01-04 16:54:00" 转换为 "2026-01-04T16:54:00+08:00"
    const normalized = timeStr.replace(' ', 'T') + '+08:00';
    const date = new Date(normalized);

    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 检查并更新已存在事件的不合理属性
   */
  private async updateEventIfNeeded(
    existingEvent: EventEntity,
    generatedEvent: LLMGeneratedEvent
  ): Promise<EventEntity> {
    try {
      const updates: Partial<EventEntity> = {};
      const reasons: string[] = [];

      // 1. 检查关键词是否需要更新
      if (this.shouldUpdateKeywords(existingEvent.keywords, generatedEvent.keywords)) {
        updates.keywords = generatedEvent.keywords || [];
        reasons.push('关键词');
      }

      // 2. 检查描述是否需要更新（现有为空或太短）
      if (this.shouldUpdateDescription(existingEvent.description, generatedEvent.description)) {
        updates.description = generatedEvent.description || null;
        reasons.push('描述');
      }

      // 3. 检查热度是否需要更新（新的更高）
      if (generatedEvent.hotness && generatedEvent.hotness > (existingEvent.hotness || 0)) {
        updates.hotness = generatedEvent.hotness;
        reasons.push('热度');
      }

      // 4. 检查时间是否需要更新（现有为空）
      if (!existingEvent.occurred_at && generatedEvent.occurred_at) {
        const parsedTime = this.parseBeijingTime(generatedEvent.occurred_at);
        if (parsedTime) {
          updates.occurred_at = parsedTime;
          reasons.push('发生时间');
        }
      }

      if (!existingEvent.peak_at && generatedEvent.peak_at) {
        const parsedTime = this.parseBeijingTime(generatedEvent.peak_at);
        if (parsedTime) {
          updates.peak_at = parsedTime;
          reasons.push('峰值时间');
        }
      }

      // 如果没有需要更新的，直接返回
      if (Object.keys(updates).length === 0) {
        console.log('[EventAuthGenerateAstVisitor] 现有事件属性合理，无需更新');
        return existingEvent;
      }

      // 执行更新
      console.log(`[EventAuthGenerateAstVisitor] 更新事件属性: ${reasons.join(', ')}`);

      return await useEntityManager(async (manager) => {
        await manager.update(EventEntity, existingEvent.id, updates);
        const updated = await manager.findOne(EventEntity, { where: { id: existingEvent.id } });
        // 如果查询失败，返回原事件（合并更新字段）
        if (!updated) {
          console.warn('[EventAuthGenerateAstVisitor] 更新后查询失败，返回合并数据');
          return { ...existingEvent, ...updates } as EventEntity;
        }
        return updated;
      });
    } catch (error) {
      // 更新失败不应该中断流程，返回原事件
      console.error('[EventAuthGenerateAstVisitor] 更新事件属性失败:', error);
      return existingEvent;
    }
  }

  /**
   * 判断关键词是否需要更新（简化逻辑：有新关键词就更新）
   */
  private shouldUpdateKeywords(
    existingKeywords: string[] | null | undefined,
    newKeywords: string[] | null | undefined
  ): boolean {
    // 有新关键词就更新
    return !!(newKeywords && newKeywords.length > 0);
  }

  /**
   * 判断描述是否需要更新（有新描述就更新）
   */
  private shouldUpdateDescription(
    existingDesc: string | null | undefined,
    newDesc: string | null | undefined
  ): boolean {
    return !!(newDesc && newDesc.length > 0);
  }
}
