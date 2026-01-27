import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { EventDispatcherAst } from '@sker/workflow-ast';
import { useEntityManager, EventEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from './llm-client';
import { ErrorHandlerOperators } from './utils/error-handler.util';

function buildDefaultPrompt(events: EventEntity[]): string {
  const eventList = events.map((e, idx) => {
    const crawlStatus = e.crawl_end_reason ? `已爬取(${e.crawl_end_reason})` : '未爬取';
    return `${idx + 1}. ID: ${e.id}
   标题: ${e.title}
   分类: ${e.category?.name || '未分类'}
   热度: ${e.hotness}
   状态: ${crawlStatus}`;
  }).join('\n\n');

  return `你是一个事件分派专家，需要从以下事件列表中选择一个事件进行爬取。

事件列表：
${eventList}

选择原则：
1. 优先选择未爬取的事件（状态为"未爬取"）
2. 在未爬取事件中，考虑平均分配各个分类
3. 适当考虑事件热度，选择高热度事件

请严格按以下 JSON 格式返回你的选择：
\`\`\`json
{
  "selectedEventId": "事件ID",
  "reason": "选择原因"
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

          // 构建提示词
          const prompt = ast.customPrompt || buildDefaultPrompt(limitedEvents);

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

          if (!parseResult.success || typeof parseResult.data !== 'object' || parseResult.data === null) {
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
