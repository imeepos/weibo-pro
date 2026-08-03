import { Injectable } from '@sker/core';
import { Handler, NodeEvent, WorkflowGraphAst, setAstError } from '@sker/workflow';
import { EventAuthGenerateAst } from '@sker/workflow-ast';
import type { EventEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { useLlmModel } from './llm-client';
import { ErrorHandlerOperators } from './utils/error-handler.util';
import { DEFAULT_SYSTEM_PROMPT } from './event-auth-generate/prompts';
import { buildUserPrompt, parseLLMResponse } from './event-auth-generate/llm';
import { validateGeneratedEvent } from './event-auth-generate/validation';
import { fetchRecentEvents, findEventById, insertEventToDatabase, updateEventIfNeeded } from './event-auth-generate/event-repository';
import { fetchAvailableCategories } from './event-auth-generate/event-category';
import { findSimilarEventByKeywords } from './event-auth-generate/dedup';
import { isValidUUID } from './event-auth-generate/utils';

@Injectable()
export class EventAuthGenerateAstVisitor {

  @Handler(EventAuthGenerateAst)
  visit(ast: EventAuthGenerateAst, input$: Observable<Record<string, unknown>>, _ctx: WorkflowGraphAst): Observable<NodeEvent> {
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
            const availableCategories = await fetchAvailableCategories();
            const categoryList = availableCategories.map(cat =>
              `- ${cat.name} (ID: ${cat.id}, 编码: ${cat.code})${cat.description ? `: ${cat.description}` : ''}`
            ).join('\n');

            // 获取最近的事件列表用于去重
            const recentEvents = await fetchRecentEvents();
            const eventListText = recentEvents.length > 0
              ? recentEvents.map((e, idx) =>
                  `${idx + 1}. ID: ${e.id}\n   标题: ${e.title}\n   描述: ${e.description || '无'}\n   创建时间: ${e.created_at.toLocaleString('zh-CN')}`
                ).join('\n\n')
              : '暂无现有事件';

            const systemPrompt = ast.systemPromptTemplate && ast.systemPromptTemplate.trim()
              ? ast.systemPromptTemplate
              : DEFAULT_SYSTEM_PROMPT;

            const enhancedSystemPrompt = `${systemPrompt}

## 可用事件分类列表

${categoryList}

**请根据事件内容，从上述分类中选择最合适的一个，使用其 UUID 作为 category_id。**

## 现有事件列表（用于去重判断）

${eventListText}

**请仔细检查新事件是否与现有事件高度相似。如果相似，设置 alreadyExists: true 并填写 existingEventId。**`;

            // 构建用户提示词
            const userPrompt = buildUserPrompt(userInputData);

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
            const generatedEvent = parseLLMResponse(responseContent);

            // 验证必填字段
            await validateGeneratedEvent(generatedEvent, availableCategories);

            // 处理去重逻辑
            if (!ast.forceInsert) {
              let existingEvent: EventEntity | null = null;

              // 优先使用 LLM 判断的结果
              if (generatedEvent.alreadyExists && generatedEvent.existingEventId) {
                console.log('[EventAuthGenerateAstVisitor] LLM 判断已存在相似事件:', generatedEvent.existingEventId);

                // 验证 UUID 格式后再查询
                if (isValidUUID(generatedEvent.existingEventId)) {
                  existingEvent = await findEventById(generatedEvent.existingEventId);
                } else {
                  console.warn('[EventAuthGenerateAstVisitor] LLM 返回的事件 ID 格式无效，跳过 ID 查询');
                }

                // 如果 LLM 返回的 ID 无效或找不到，使用传统方法二次确认
                if (!existingEvent) {
                  console.warn('[EventAuthGenerateAstVisitor] 使用关键词匹配方法验证');
                  existingEvent = findSimilarEventByKeywords(generatedEvent, recentEvents);
                }
              }

              // 如果 LLM 没有判断为重复，使用传统方法兜底检查
              if (!existingEvent) {
                existingEvent = findSimilarEventByKeywords(generatedEvent, recentEvents);
              }

              // 如果找到相似事件，检查是否需要更新属性
              if (existingEvent) {
                console.log('[EventAuthGenerateAstVisitor] 发现相似事件:', existingEvent.id);

                // 更新现有事件的属性（如果 LLM 生成的更合理）
                const updatedEvent = await updateEventIfNeeded(existingEvent, generatedEvent);

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
            const insertedEvent = await insertEventToDatabase(generatedEvent);

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
}
