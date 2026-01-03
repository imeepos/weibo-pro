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

  @Input({ title: '条件模式', defaultValue: 'every' })
  mode: 'some' | 'every' | 'none' | 'majority' | 'count' | 'xor' | 'ratio' | 'first' | 'sequential' = 'every';

  @Input({ title: '阈值数量', defaultValue: 1 })
  threshold: number = 1;

  @Input({ title: '比例阈值', defaultValue: 0.5 })
  ratioThreshold: number = 0.5;

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
  /**
   * 检查数组中是否存在连续 n 个 true
   */
  private hasSequentialTrue(conditions: boolean[], n: number): boolean {
    if (n <= 0 || n > conditions.length) return false;

    let consecutiveCount = 0;
    for (const condition of conditions) {
      if (condition === true) {
        consecutiveCount++;
        if (consecutiveCount >= n) {
          return true;
        }
      } else {
        consecutiveCount = 0;
      }
    }
    return false;
  }

  @Handler(PassThroughAst)
  visit(ast: PassThroughAst, input$: Observable<PassThroughAst>, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.subscribe({
        next: (inputData) => {
          // 根据 mode 决定条件判断逻辑
          const enableConditions = Array.isArray(inputData.enable) ? inputData.enable : [inputData.enable];
          const mode = inputData.mode || 'every';
          const threshold = inputData.threshold || 1;
          const ratioThreshold = inputData.ratioThreshold || 0.5;

          let shouldPass = false;

          if (enableConditions.length === 0) {
            // 空数组时默认透传
            shouldPass = true;
          } else {
            const trueCount = enableConditions.filter(condition => condition === true).length;
            const totalCount = enableConditions.length;

            switch (mode) {
              case 'every':
                // 所有条件都为 true
                shouldPass = trueCount === totalCount;
                break;

              case 'some':
                // 至少一个条件为 true
                shouldPass = trueCount > 0;
                break;

              case 'none':
                // 所有条件都为 false
                shouldPass = trueCount === 0;
                break;

              case 'majority':
                // 超过半数为 true
                shouldPass = trueCount > totalCount / 2;
                break;

              case 'count':
                // 满足指定数量的条件为 true
                shouldPass = trueCount >= threshold;
                break;

              case 'xor':
                // 有且仅有一个条件为 true（互斥）
                shouldPass = trueCount === 1;
                break;

              case 'ratio':
                // 满足指定比例的条件为 true
                shouldPass = (trueCount / totalCount) >= ratioThreshold;
                break;

              case 'first':
                // 第一个条件为 true
                shouldPass = enableConditions[0] === true;
                break;

              case 'sequential':
                // 连续 threshold 个条件为 true
                shouldPass = this.hasSequentialTrue(enableConditions, threshold);
                break;

              default:
                shouldPass = false;
            }
          }

          if (shouldPass) {
            ast.output = inputData.input;
            ast.emitCount += 1;
            obs.next({ type: 'node_emit', id: ast.id, data: { output: ast.output, emitCount: ast.emitCount } });
          }
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
        obs.complete();
      };
    });
  }
}
