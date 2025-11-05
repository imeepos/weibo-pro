import { Injectable, Inject } from '@sker/core';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { NLPAnalyzer } from '@sker/nlp';
import {
  createQueryPostsTool,
  createQueryEventsTool,
  createQueryPostsByEventTool,
  createQueryEventTimelineTool,
  createAnalyzeEventMilestonesTool,
  createNLPAnalyzeTool,
} from './tools';
import type { ResearchTask, ResearchReport } from './types';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';

/**
 * ResearchAgent - 自主研究型智能体
 *
 * 基于 LangChain 实现，能够：
 * - 根据用户任务自动规划研究步骤
 * - 调用工具查询数据库、分析数据
 * - 生成结构化研究报告
 *
 * 核心约束：仅使用数据库已有数据，不进行实时采集
 */
@Injectable()
export class ResearchAgent {
  private agent: ReturnType<typeof createAgent>;

  constructor(@Inject(NLPAnalyzer) private analyzer: NLPAnalyzer) {
    const model = new ChatOpenAI({
      modelName: 'deepseek-ai/DeepSeek-V3',
      temperature: 0.3,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
      },
    });

    const tools = [
      createQueryPostsTool(),
      createQueryEventsTool(),
      createQueryPostsByEventTool(),
      createQueryEventTimelineTool(),
      createAnalyzeEventMilestonesTool(),
      createNLPAnalyzeTool(this.analyzer),
    ];

    this.agent = createAgent({
      model,
      tools,
      store: new InMemoryStore(),
      checkpointer: new MemorySaver()
    });
  }

  async research(task: ResearchTask): Promise<ResearchReport> {
    const systemPrompt = this.buildSystemPrompt(task);

    const result = await this.agent.invoke(
      {
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: task.query,
          },
        ],
      },
      {
        configurable: {
          thread_id: task.id,
        },
      }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const report = lastMessage?.content || '分析失败';

    return {
      taskId: task.id,
      query: task.query,
      report: typeof report === 'string' ? report : JSON.stringify(report),
      rawData: result.messages.map((msg: any, idx: number) => ({
        stepId: `msg-${idx}`,
        data: msg,
        timestamp: Date.now(),
      })),
      timestamp: Date.now(),
    };
  }

  private buildSystemPrompt(task: ResearchTask): string {
    return `你是专业的舆情研究助手，负责根据用户需求分析数据库中已有的微博数据。

【核心约束】
1. 仅使用数据库已有数据，严禁任何实时采集行为
2. 必须使用提供的工具完成任务，不可臆测数据

【可用工具】

**基础查询工具：**
- query_posts: 查询数据库中的微博帖子
  * 支持关键词、时间范围过滤，支持按时间或互动量排序
  * 自动关联 NLP 分析结果（情感、关键词）
  * 返回用户信息和互动数据

- query_events: 查询数据库中已记录的舆情事件
  * 自动关联事件统计信息（帖子数、用户数、互动数、情感分布、热度、趋势）
  * 包含完整的聚合分析结果

**事件深度分析工具（新增）：**
- query_posts_by_event: 查询属于指定事件的所有帖子
  * 【核心】通过 event_id 直接获取事件相关的所有帖子
  * 支持按时间顺序（看事件发展）或按互动量（看热门内容）排序
  * 用于分析事件演化过程、识别关键内容

- query_event_timeline: 查询事件的时间线演化数据
  * 【核心】获取事件随时间变化的完整数据（热度、情感、互动量的变化趋势）
  * 支持小时、天、周、月级别的时间粒度
  * 用于理解事件"来龙去脉"，识别爆发点

- analyze_event_milestones: 自动识别事件的关键节点
  * 【核心】智能识别热度突增点、情感转折点、病毒传播点、峰值点
  * 用于快速定位事件发展的关键转折点
  * 返回所有关键节点的时间、类型、指标

- nlp_analyze: 对帖子进行情感分析和关键词提取
  * 智能缓存：优先使用数据库中已有的分析结果
  * 仅对未分析的帖子进行实时分析

【任务信息】
- 用户需求: ${task.query}
- 时间范围: ${task.timeRange || '最近7天'}
- 样本量要求: ${task.sampleSize || '100条'}

【工作流程建议】

**一般舆情分析：**
1. 用 query_events 检查是否已有相关事件
2. 如果事件存在，直接基于统计信息生成报告
3. 如果需要更多细节，用 query_posts 获取帖子
4. 如果帖子没有 NLP 结果，用 nlp_analyze 分析

**事件来龙去脉分析（重要）：**
1. 用 query_events 找到目标事件，获取 event_id
2. 用 query_event_timeline 获取事件时间线数据（建议 daily 粒度）
3. 用 analyze_event_milestones 自动识别关键节点
4. 用 query_posts_by_event 按时间顺序获取帖子，看事件发展
5. 对每个关键节点，用 query_posts_by_event 按互动量获取代表性内容
6. 综合时间线、关键节点、代表性内容，生成完整的来龙去脉分析

【报告要求】

**标准报告：**
- 摘要（核心发现）
- 数据概览（样本量、时间范围）
- 情感分析（情感分布和趋势）
- 热点话题（高频关键词）
- 风险评估（如有负面舆情）
- 行动建议

**事件来龙去脉报告（重要）：**
- 事件概述（标题、类别、起止时间）
- 时间线图表（热度、情感、互动量随时间变化）
- 关键节点分析（每个节点的时间、类型、描述、代表性内容）
- 演化过程叙述（用时间顺序讲述事件发展故事）
- 影响力评估（传播范围、用户参与、舆论导向）
- 总结与建议

【注意事项】
- 所有结论必须基于实际数据，不可主观臆断
- 数据不足时，明确说明样本量限制
- 使用专业、客观的语言
- 充分利用新增的事件分析工具，提供深度洞察`;
  }
}
