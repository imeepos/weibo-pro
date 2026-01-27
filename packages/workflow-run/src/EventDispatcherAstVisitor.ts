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

    return `${idx + 1}. ID: ${e.id}
   标题: ${e.title}
   分类: ${e.category?.name || '未分类'}
   状态: ${crawlStatus}
   总时间跨度: ${formatDays(totalDays)} (${eventStartTime.toISOString().split('T')[0]} ~ ${currentTime.toISOString().split('T')[0]})
   已爬取: ${timeRangeInfo ? `${formatDays(crawledDays)} (${coveragePercent}%) [${timeRangeInfo.min.split('T')[0]} ~ ${timeRangeInfo.max.split('T')[0]}]` : '无数据'}
   时间差值: ${formatDays(gapDays)} (${timeRangeInfo ? `${coveragePercent}%已覆盖` : '0%已覆盖'})
   最后更新: ${formatDays(updatedDaysAgo)}前 (${e.updated_at.toISOString().split('T')[0]})`;
  }).join('\n\n');

  return `你是一个事件分派专家，需要从以下事件列表中选择一个事件进行爬取。

事件列表：
${eventList}

选择原则（按优先级排序）：
1. 【强制】优先选择未爬取完成的事件（状态为"未爬取"）
2. 【核心】时间差值大者优先 - 时间差值 = 总时间跨度 - 已爬取时间范围，差值越大说明数据缺口越大
3. 【防重】更新时间早者优先 - 优先选择最后更新时间较早的事件，防止重复爬取
4. 【连续】已有时间范围的事件 - 对于已有帖子数据的事件，从最大时间继续爬取，保持数据连续性

注意：
- 时间差值相同的情况下，选择更新时间更早的事件
- 忽略事件热度，专注数据完整性
- 忽略分类平均分配，选择数据缺口最大的事件

请严格按以下 JSON 格式返回你的选择：
\`\`\`json
{
  "selectedEventId": "事件ID",
  "reason": "选择原因（需说明时间差值、更新时间等关键因素）"
}
\`\`\``;
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

          // 查询所有事件
          const events = await useEntityManager(async (manager) => {
            return await manager
              .createQueryBuilder(EventEntity, 'event')
              .leftJoinAndSelect('event.category', 'category')
              .where('event.status = :status', { status: 'active' })
              .orderBy('event.crawl_end_reason', 'ASC')
              .addOrderBy('event.hotness', 'DESC')
              .getMany();
          });

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          if (events.length === 0) {
            throw new Error('没有可用的事件');
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
