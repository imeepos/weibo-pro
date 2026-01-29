import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { EventDispatcherAst } from '@sker/workflow-ast';
import { useEntityManager, EventEntity, WeiboPostEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from './llm-client';
import { ErrorHandlerOperators } from './utils/error-handler.util';

/**
 * 时间范围接口
 */
interface TimeRange {
  min: string;
  max: string;
}

/**
 * 计算两个日期之间的天数差
 */
function calculateDaysDiff(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 格式化天数为可读字符串
 */
function formatDays(days: number): string {
  if (days < 1) return `${Math.floor(days * 24)}小时`;
  if (days < 30) return `${days}天`;
  return `${(days / 30).toFixed(1)}月`;
}

/**
 * 构建默认提示词（包含时间差值和更新时间信息）
 */
function buildDefaultPrompt(
  events: EventEntity[],
  timeRangeMap: Map<string, TimeRange>,
  currentTime: Date
): string {
  const eventList = events.map((e, idx) => {
    const crawlStatus = e.crawl_end_reason ? `已爬取(${e.crawl_end_reason})` : '未爬取';
    const timeRangeInfo = timeRangeMap.get(e.id);

    // 计算总时间范围（事件发生时间 ~ 当前时间）
    const eventStartTime = e.occurred_at || e.created_at;
    const totalDays = calculateDaysDiff(eventStartTime, currentTime);

    // 计算已爬取时间范围和差值
    let crawledDays = 0;
    let gapDays = totalDays;
    let coveragePercent = 0;

    if (timeRangeInfo) {
      const postMinTime = new Date(timeRangeInfo.min);
      const postMaxTime = new Date(timeRangeInfo.max);
      crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
      // 计算未覆盖的时间差（从事件开始到最早帖子，从最晚帖子到现在）
      const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
      const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
      gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
      coveragePercent = Math.round((crawledDays / totalDays) * 100);
    }

    // 计算更新时间（事件最后更新时间距今）
    const updatedDaysAgo = calculateDaysDiff(e.updated_at, currentTime);

    return `[序号${idx + 1}] ID: ${e.id}
标题: ${e.title}
关键词: ${e.keywords && e.keywords.length > 0 ? e.keywords.join(', ') : '(无)'}
分类: ${e.category?.name || '未分类'}
状态: ${crawlStatus}
总时间跨度: ${formatDays(totalDays)} (${eventStartTime.toISOString().split('T')[0]} ~ ${currentTime.toISOString().split('T')[0]})
已爬取: ${timeRangeInfo ? `${formatDays(crawledDays)} (${coveragePercent}%) [${timeRangeInfo.min.split('T')[0]} ~ ${timeRangeInfo.max.split('T')[0]}]` : '无数据'}
时间差值: ${formatDays(gapDays)} (${timeRangeInfo ? `${coveragePercent}%已覆盖` : '0%已覆盖'})
最后更新: ${formatDays(updatedDaysAgo)}前 (${e.updated_at.toISOString().split('T')[0]})`;
  }).join('\n\n');

  return `# 事件分派任务

YOU MUST 从以下事件列表中选择【且仅选择一个】事件进行爬取。返回空选择或跳过选择是严格禁止的。

## 可选事件列表

**注意**：以下事件已自动过滤掉 keyword 为空的错误/假事件，所有事件都是有效的。

${eventList}

## 选择逻辑（按此顺序逐步评估）

第一步：过滤未完成事件
- 优先选择状态为"未爬取"的事件
- 如果所有事件都已爬取，选择时间差值最大的事件进行补充爬取

第二步：计算优先级分数
- 未爬取事件：基础分 100 + 时间差值天数
- 已爬取事件：基础分 50 + 时间差值天数
- 更新时间早者额外加 10 分（防重）

第三步：选择得分最高的事件
- 如果得分相同，选择列表中排在前面的事件

## 输出格式（必须严格遵守）

\`\`\`json
{
  "selectedEventId": "事件的真实ID（UUID格式，如：550e8400-e29b-41d4-a716-446655440000）",
  "reason": "选择原因（必须说明得分计算过程）"
}
\`\`\`

## 关键约束（强制执行）

1. **必须返回真实的事件 ID**，不是列表中的序号 [1]、[2]
2. 事件 ID 通常是 UUID 格式（36位字符串，包含字母和数字）
3. selectedEventId 字段必须存在且不为空
4. 禁止返回 null、undefined 或空字符串
5. 禁止返回序号（如 "1"、"2"、"65"）

## 示例

### 示例1：正确格式
输入事件：
[序号1] ID: 550e8400-e29b-41d4-a716-446655440000, 状态: 未爬取, 时间差值: 30天
[序号2] ID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8, 状态: 已爬取, 时间差值: 5天

正确输出：
\`\`\`json
{
  "selectedEventId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "未爬取事件，优先级最高，得分100+30=130"
}
\`\`\`

### 示例2：错误格式（禁止）
❌ 错误：{"selectedEventId": "1", "reason": "选择了第一个"}  // 这是序号，不是 ID
❌ 错误：{"selectedEventId": "65", "reason": "选择了第65个"}  // 绝对禁止返回序号
✅ 正确：{"selectedEventId": "550e8400-e29b-41d4-a716-446655440000", "reason": "..."}  // 返回完整 UUID

## 重要提醒

**序号 vs ID 的区别**：
- 序号：[1]、[2]、[3] ... 只是列表的编号，**不能用于选择**
- ID：550e8400-e29b-41d4-a716-446655440000 ... 事件的真实标识符，**必须返回这个**

**记住**：你必须在 selectedEventId 字段中填写 ID 列后面的完整 UUID 字符串！`;
}

@Injectable()
export class EventDispatcherAstVisitor {
  @Handler(EventDispatcherAst)
  handler(
    ast: EventDispatcherAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      interface WrappedContext extends Record<string, unknown> {
        abortSignal: AbortSignal;
      }

      const wrappedCtx: WrappedContext = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          // 查询所有事件（过滤掉 keyword 为空的假事件）
          const events = await useEntityManager(async (manager) => {
            return await manager
              .createQueryBuilder(EventEntity, 'event')
              .leftJoinAndSelect('event.category', 'category')
              .where('event.status = :status', { status: 'active' })
              .andWhere('array_length(event.keywords, 1) IS NOT NULL')
              .orderBy('event.updated_at', 'ASC')
              .addOrderBy('event.created_at', 'DESC')
              .getMany();
          });

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          if (events.length === 0) {
            throw new Error('没有可用的事件：所有事件的 keyword 都为空，或者没有 active 状态的事件');
          }

          // 应用 limit
          const limitedEvents = ast.limit > 0 ? events.slice(0, ast.limit) : events;

          // 更新统计信息
          ast.totalEvents = events.length;
          ast.uncrawledCount = events.filter(e => !e.crawl_end_reason).length;

          // 批量查询所有事件的时间范围
          const timeRangeMap = await useEntityManager(async (manager) => {
            const eventIds = limitedEvents.map(e => e.id);
            if (eventIds.length === 0) {
              return new Map<string, TimeRange>();
            }

            const timeRanges = await manager
              .createQueryBuilder(WeiboPostEntity, 'post')
              .select('post.event_id', 'event_id')
              .addSelect('MIN(post.created_at)', 'min')
              .addSelect('MAX(post.created_at)', 'max')
              .where('post.event_id IN (:...eventIds)', { eventIds })
              .andWhere('post.created_at IS NOT NULL')
              .groupBy('post.event_id')
              .getRawMany<{ event_id: string; min: Date; max: Date }>();

            // 转换为 Map 方便查找
            return new Map(
              timeRanges.map(r => [r.event_id, { min: r.min.toISOString(), max: r.max.toISOString() }])
            );
          });

          // 构建提示词
          const currentTime = new Date();
          const defaultPrompt = buildDefaultPrompt(limitedEvents, timeRangeMap, currentTime);

          // 如果有自定义提示词，将其附加到默认提示词后面，并增加权重
          let prompt = defaultPrompt;
          if (ast.customPrompt && ast.customPrompt.trim()) {
            prompt = `${defaultPrompt}

====================================
【用户自定义需求】（最高优先级）
====================================
${ast.customPrompt.trim()}

====================================
注意：以上用户自定义需求具有最高优先级，必须优先满足！
====================================`;
          }

          // 调用 LLM
          const llmModel = useLlmModel({ temperature: 0.7 });
          const response = await llmModel.invoke([{ role: 'user', content: prompt }]);
          const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          // 解析 JSON
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
          const jsonContent = jsonMatch[1]?.trim() || content.trim();
          const parseResult = parseWithHarmony(jsonContent);

          if (typeof parseResult.data !== 'object' || parseResult.data === null) {
            throw new Error('LLM 返回的 JSON 格式无效');
          }

          const result = parseResult.data as Record<string, unknown>;
          const selectedEventId = result.selectedEventId as string;

          if (!selectedEventId) {
            throw new Error('LLM 未返回 selectedEventId');
          }

          // 查找选中的事件
          const selectedEvent = events.find(e => e.id === selectedEventId);
          if (!selectedEvent) {
            throw new Error(`选中的事件 ID ${selectedEventId} 不存在`);
          }

          // 更新 AST 输出
          ast.selectedEventId = selectedEventId;
          ast.selectedEvent = selectedEvent;
          ast.eventsList = limitedEvents;

          console.log(`[EventDispatcherAstVisitor] 选中事件: ${selectedEvent.title} (${selectedEventId})`);

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                selectedEventId,
                selectedEvent,
                eventsList: limitedEvents
              }
            }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[EventDispatcherAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[EventDispatcherAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          console.error(`[EventDispatcherAstVisitor] 执行失败:`, error);
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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
}
