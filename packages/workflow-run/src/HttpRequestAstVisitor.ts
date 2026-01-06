import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { HttpRequestAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

@Injectable()
export class HttpRequestAstVisitor {
  @Handler(HttpRequestAst)
  handler(
    ast: HttpRequestAst,
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

          if (!ast.url) {
            throw new Error('URL 不能为空');
          }

          const headers: Record<string, string> = {};
          if (ast.headers && typeof ast.headers === 'object') {
            Object.entries(ast.headers).forEach(([key, value]) => {
              if (value) headers[key] = String(value);
            });
          }

          const requestInit: RequestInit = {
            method: ast.method,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            signal: abortController.signal
          };

          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ast.method) && ast.body) {
            requestInit.body = typeof ast.body === 'string' ? ast.body : JSON.stringify(ast.body);
          }

          const response = await fetch(ast.url, requestInit);

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          const rawContentType = response.headers.get('content-type') || '';
          const contentType = rawContentType.split(';')[0]!.trim();

          let responseBody: any;
          if (contentType.includes('application/json')) {
            responseBody = await response.json();
          } else {
            responseBody = await response.text();
          }

          ast.response = responseBody;
          ast.status = response.status;
          ast.contentType = contentType;

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                response: responseBody,
                status: response.status,
                contentType: contentType
              }
            }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[HttpRequestAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[HttpRequestAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
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
