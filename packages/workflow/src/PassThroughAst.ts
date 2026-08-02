import { Ast, WorkflowGraphAst } from "./ast";
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
  @Input({ title: '输入', defaultValue: [], mode: IS_MULTI })
  input: any[] = [];

  @Input({ title: '启用条件', defaultValue: [], mode: IS_MULTI })
  enable: boolean[] = [];

  @Input({
    title: '条件模式',
    defaultValue: 'every',
    type: 'select',
    options: ['every', 'some', 'none', 'majority', 'count', 'xor', 'ratio', 'first', 'sequential', 'weighted']
  })
  mode: 'some' | 'every' | 'none' | 'majority' | 'count' | 'xor' | 'ratio' | 'first' | 'sequential' | 'weighted' = 'some';

  @Input({ title: '阈值', defaultValue: 0.5 })
  threshold: number = 0.5;

  @Output({ title: '输出', defaultValue: '', isRouter: true })
  output: any = '';

  type = 'PassThroughAst';
}


import { Injectable } from '@sker/core';
import { Handler } from './decorator';
import { NodeEvent } from './execution/events';
import { setAstError } from './ast-utils';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

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

  /**
   * 从工作流图中获取连接到指定节点端口的边权重
   */
  private getEdgeWeights(ast: PassThroughAst, ctx: WorkflowGraphAst | undefined, portName: string): number[] {
    if (!ctx || !ctx.edges) return [];

    // 找到连接到当前节点 enable 端口的所有边
    const enableEdges = ctx.edges.filter(edge =>
      edge.to === ast.id && edge.toProperty === portName
    );

    // 提取权重，默认为 1
    return enableEdges.map(edge => edge.weight ?? 1);
  }

  @Handler(PassThroughAst)
  visit(ast: PassThroughAst, input$: Observable<PassThroughAst>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          // 根据 mode 决定条件判断逻辑
          const enableConditions = Array.isArray(inputData.enable) ? inputData.enable : [inputData.enable];
          const mode = inputData.mode || 'some';
          const threshold = inputData.threshold ?? 0.5;

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
                // 满足指定数量的条件为 true（threshold 表示数量）
                shouldPass = trueCount >= threshold;
                break;

              case 'xor':
                // 有且仅有一个条件为 true（互斥）
                shouldPass = trueCount === 1;
                break;

              case 'ratio':
                // 满足指定比例的条件为 true（threshold 表示比例 0-1）
                shouldPass = (trueCount / totalCount) >= threshold;
                break;

              case 'first':
                // 第一个条件为 true
                shouldPass = enableConditions[0] === true;
                break;

              case 'sequential':
                // 连续 threshold 个条件为 true（threshold 表示连续数量）
                shouldPass = this.hasSequentialTrue(enableConditions, Math.floor(threshold));
                break;

              case 'weighted': {
                // 加权模式：根据边权重计算加权分数（threshold 表示加权比例 0-1）
                const weights = this.getEdgeWeights(ast, ctx, 'enable');

                if (weights.length === 0 || weights.length !== enableConditions.length) {
                  // 没有边权重或数量不匹配，回退到 every 模式
                  shouldPass = trueCount === totalCount;
                } else {
                  // 计算加权总分
                  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                  const actualWeight = enableConditions.reduce((sum, condition, i) => {
                    return sum + (condition ? weights[i]! : 0);
                  }, 0);
                  const weightedScore = totalWeight > 0 ? actualWeight / totalWeight : 0;
                  shouldPass = weightedScore >= threshold;
                }
                break;
              }

              default:
                shouldPass = true;
            }
          }

          if (shouldPass) {
            ast.emitCount += 1;
            if (Array.isArray(inputData.input) && inputData.input.length === 1) {
              ast.output = inputData.input[0]
            } else {
              ast.output = inputData.input;
            }
            return [
              { type: 'node_emit' as const, id: ast.id, data: { output: ast.output, emitCount: ast.emitCount } }
            ];
          }
          return [];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          // 发射空数据让下游继续
          obs.next({ type: 'node_emit', id: ast.id, data: {} });
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
