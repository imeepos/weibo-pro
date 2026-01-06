import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ClaudeCodeAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';
import { ClaudeCodeService } from './services/claude-code.service';

@Injectable()
export class ClaudeCodeAstVisitor {
  constructor(private claudeCode: ClaudeCodeService) {}

  @Handler(ClaudeCodeAst)
  visit(ast: ClaudeCodeAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
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

          const files = ast.files ? ast.files.split('\n').filter(f => f.trim()) : undefined;
          const result = await this.claudeCode.execute(ast.prompt, {
            cwd: ast.cwd || undefined,
            files,
            dangerouslySkipPermissions: true
          });

          return [
            { type: 'node_emit' as const, id: ast.id, data: { response: result.content || result.text || JSON.stringify(result) } }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[ClaudeCodeAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[ClaudeCodeAstVisitor]' }),
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
