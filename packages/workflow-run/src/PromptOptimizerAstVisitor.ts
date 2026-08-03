import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { PromptOptimizerAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { PromptOptimizerExecutor } from './services/PromptOptimizerExecutor';

/**
 * 提示词优化器执行器
 *
 * 仅保留 @Handler 响应式管道；优化算法抽到
 * services/PromptOptimizerExecutor.ts，LLM 交互抽到 services/PromptOptimizerLlm.ts。
 */
@Injectable()
export class PromptOptimizerAstVisitor {
  private executor: PromptOptimizerExecutor;

  constructor() {
    this.executor = new PromptOptimizerExecutor();
  }

  @Handler(PromptOptimizerAst)
  visit(
    ast: PromptOptimizerAst,
    input$: Observable<Record<string, unknown>>,
    _ctx: WorkflowGraphAst
  ) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();
      const _startTime = Date.now();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$
        .pipe(
          concatMap(async (inputData) => {
            ast.emitCount += 1;

            // 合并输入数据
            if (inputData) {
              Object.keys(inputData).forEach((key) => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }

            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            // 执行优化流程
            const result = await this.executor.runOptimization(ast, abortController.signal);

            return [
              {
                type: 'node_emit' as const,
                id: ast.id,
                data: {
                  result,
                  bestPrompt: result.bestPrompt,
                  bestScore: result.bestScore,
                  success: result.success,
                },
              },
            ];
          }),
          mergeMap((events: NodeEvent[]) => from(events))
        )
        .subscribe({
          next: (event: NodeEvent) => {
            obs.next(event);
          },
          error: (error) => {
            ast.state = 'fail';
            setAstError(ast, error);
            obs.next({
              type: 'node_fail',
              id: ast.id,
              error: ast.error?.message,
            });
          },
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          },
        });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
