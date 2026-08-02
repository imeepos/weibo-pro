import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, throwError } from 'rxjs';
import { concatMap, distinctUntilChanged, takeWhile } from 'rxjs/operators';
import { ChapterGenerationService } from './services/ChapterGenerationService';

/**
 * StoryWeaver 节点访问器
 * 职责：编排工作流执行，协调章节生成服务
 */
@Injectable()
export class StoryWeaverAstVisitor {
  constructor(
    @Inject(ChapterGenerationService) private chapterGenerationService: ChapterGenerationService
  ) {}

  @Handler(StoryWeaverAst)
  visit(ast: StoryWeaverAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        distinctUntilChanged(),
        concatMap((inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            return throwError(() => new Error('工作流已取消'));
          }

          // 启用流式模式，接收实时文本片段和最终结果
          return this.chapterGenerationService.generateChapterWithRetry(
            ast,
            ctx,
            abortController.signal,
            true  // enableStreaming = true
          );
        }),
        // 检测完成条件：达到目标章节数后停止接收新输入
        // inclusive=true 确保最后一章的数据能正确发出
        takeWhile(() => !ast.isComplete, true)
      ).subscribe({
        next: (events: NodeEvent[] | NodeEvent) => {
          // 处理单个事件（流式 delta 事件）
          if (!Array.isArray(events)) {
            obs.next(events);
            return;
          }

          // 处理事件数组（最终完整结果）
          events.forEach(event => obs.next(event));
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
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
