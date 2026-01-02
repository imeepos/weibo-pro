import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ClaudeCodeReviewAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ClaudeCodeService } from './services/claude-code.service';

@Injectable()
export class ClaudeCodeReviewAstVisitor {
  constructor(private claudeCode: ClaudeCodeService) {}

  @Handler(ClaudeCodeReviewAst)
  visit(ast: ClaudeCodeReviewAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          const result = await this.claudeCode.reviewCode(ast.code, ast.language);

          return [
            { type: 'node_emit' as const, id: ast.id, data: { result: result.content || result.text || JSON.stringify(result) } }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
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
