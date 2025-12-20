import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { HttpAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

@Injectable()
export class HttpAstVisitor {
  @Handler(HttpAst)
  handler(
    ast: HttpAst,
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

          // 构建完整 URL（包含查询参数）
          let fullUrl = ast.url;
          if (ast.queryParams && ast.queryParams.length > 0) {
            const searchParams = new URLSearchParams();
            ast.queryParams.forEach(param => {
              if (param.key && param.value) {
                searchParams.append(param.key, param.value);
              }
            });
            const queryString = searchParams.toString();
            if (queryString) {
              fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
            }
          }

          // 构建请求头
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (ast.headers && ast.headers.length > 0) {
            ast.headers.forEach(header => {
              if (header.key && header.value) {
                headers[header.key] = header.value;
              }
            });
          }

          // 构建请求选项
          const requestInit: RequestInit = {
            method: ast.method,
            headers,
            signal: abortController.signal
          };

          // 添加请求体（仅对 POST, PUT, PATCH, DELETE）
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ast.method) && ast.body) {
            requestInit.body = ast.body;
          }

          console.log(`[HttpAstVisitor] 发起 ${ast.method} 请求:`, fullUrl);

          const response = await fetch(fullUrl, requestInit);

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          // 获取响应头
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          // 解析响应体
          let responseBody: any;
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            responseBody = await response.json();
          } else if (contentType?.includes('text/')) {
            responseBody = await response.text();
          } else {
            responseBody = await response.text();
          }

          // 更新 AST 输出
          ast.response = responseBody;
          ast.status = response.status;
          ast.responseHeaders = responseHeaders;

          console.log(`[HttpAstVisitor] 请求成功，状态码: ${response.status}`);

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                response: responseBody,
                status: response.status,
                responseHeaders
              }
            }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          console.error(`[HttpAstVisitor] 请求失败:`, error);
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        console.log('[HttpAstVisitor] 订阅被取消，触发 AbortSignal');
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
