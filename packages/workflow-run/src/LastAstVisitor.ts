import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { LastAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';

@Injectable()
export class LastAstVisitor {
  @Handler(LastAst)
  handler(ast: LastAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      input$.subscribe({
        next: (inputData) => {
          // IS_BUFFER 模式：调度器已收集所有数据到 ast.input 数组
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          // 从收集的数组中取最后一个
          const buffer = ast.input;
          if (Array.isArray(buffer) && buffer.length > 0) {
            ast.last = buffer[buffer.length - 1];
          } else {
            ast.last = null;
          }

          console.log('[LastAstVisitor] 取最后值', {
            bufferLength: buffer?.length,
            last: ast.last
          });

          ast.emitCount = 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { last: ast.last, emitCount: ast.emitCount } });
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });
    });
  }
}
