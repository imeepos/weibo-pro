import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { Observable, concatMap, takeWhile } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { StoryWeaverAst } from '@sker/workflow-ast';

/**
 * StoryWeaver 节点访问器（浏览器端）
 * 专门的实现：支持检测 isComplete 条件自动停止循环
 */
@Injectable()
export class StoryWeaverAstVisitor {
  @Handler(StoryWeaverAst)
  handler(ast: StoryWeaverAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
      ast.state = 'running'
      obs.next({ type: 'node_runing', id: ast.id })

      $input.pipe(
        concatMap(input => executeRemote(ast, ctx, input)),
        // 检测完成条件：达到目标章节数后停止接收新输入
        // inclusive=true 确保最后一章的数据能正确发出
        takeWhile(() => !ast.isComplete, true)
      ).subscribe({
        next: (event) => obs.next(event),
        complete: () => {
          ast.state = 'success';
          ast.error = undefined;
          obs.next({ type: 'node_success', id: ast.id })
          obs.complete();
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error)
          obs.next({ type: 'node_fail', id: ast.id, error: error.message })
          obs.complete();
        }
      })
    })
  }
}