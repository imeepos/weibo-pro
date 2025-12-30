import { Ast } from "./ast";
import { Input, IS_MULTI, Node, Output } from "./decorator";
/**
 * 透传节点 - 接收输入立即发射，用于形成循环
 *
 * 使用场景：
 * - 当需要形成循环但不支持自循环时
 * - 作为数据中转站
 */
@Node({
  title: '透传节点',
  type: 'basic'
})
export class PassThroughAst extends Ast {
  @Input({ title: '输入', defaultValue: '' })
  input: any = '';

  @Input({ title: '启用条件', defaultValue: [], mode: IS_MULTI })
  enable: boolean[] = [];

  @Output({ title: '输出', defaultValue: '', isRouter: true })
  output: any = '';

  type: 'PassThroughAst' = 'PassThroughAst';
}


import { Injectable } from '@sker/core';
import { Handler } from './decorator';
import { NodeEvent } from './execution/events';
import { setAstError } from './ast-utils';
import { Observable } from 'rxjs';

/**
 * 透传节点执行器 - 接收输入立即原样输出
 */
@Injectable()
export class PassThroughAstVisitor {
  @Handler(PassThroughAst)
  visit(ast: PassThroughAst, input$: Observable<PassThroughAst>, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.subscribe({
        next: (inputData) => {
          ast.emitCount += 1;
          // 空数组或所有 enable 条件都为 true 才透传
          const enableConditions = Array.isArray(inputData.enable) ? inputData.enable : [inputData.enable];
          const allEnabled = enableConditions.length === 0 || enableConditions.every(condition => condition === true);

          if (allEnabled) {
            ast.output = inputData.input;
            obs.next({ type: 'node_emit', id: ast.id, data: { output: ast.output, emitCount: ast.emitCount } });
          }
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
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
        subscription.unsubscribe();
        obs.complete();
      };
    });
  }
}
