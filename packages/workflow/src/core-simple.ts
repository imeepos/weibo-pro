/**
 * 反应式工作流引擎 v2 - 最简洁版本
 *
 * 核心思想：
 * run<Input, Output>(node, input$): Observable<Output>
 *
 * Input → switchMap → visitor.visit(node) → Output
 *
 * 节点就是一个函数：Observable<Input> => Observable<Output>
 */

import { Observable, switchMap, combineLatest, merge, of, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { INode, IEdge } from './types';
import { WorkflowGraphAst } from './ast';
import { root } from '@sker/core';
import { VisitorExecutor } from './execution/visitor-executor';

/**
 * 运行单个节点
 *
 * @param node 节点实例
 * @param input$ 输入流
 * @returns 输出流
 *
 * 示例：
 * run<string, string>(nodeA, of('hello')).subscribe(output => {
 *     console.log(output);  // "HELLO"
 * })
 */
export function run<Input = any, Output = any>(
    node: INode,
    input$: Observable<Input>
): Observable<Output> {
    const visitor = root.get(VisitorExecutor);

    return input$.pipe(
        switchMap((inputData: Input) => {
            // Step 1: 赋值输入到节点
            if (inputData && typeof inputData === 'object') {
                Object.assign(node, inputData);
            }

            // Step 2: 执行节点 Handler
            return visitor.visit(node, {} as any).pipe(
                tap(updated => {
                    // Step 3: 更新 @Output BehaviorSubject
                    if (updated.metadata) {
                        updated.metadata.outputs.forEach(output => {
                            const subject = (node as any)[output.property];
                            if (subject instanceof BehaviorSubject) {
                                subject.next((updated as any)[output.property]);
                            }
                        });
                    }
                }),
                // Step 4: 提取输出
                map((updated: any) => {
                    const outputProp = node.metadata?.outputs[0]?.property || 'output';
                    return (updated as any)[outputProp] as Output;
                })
            );
        })
    );
}

/**
 * 为节点构建输入流（根据入边聚合上游输出）
 *
 * @param node 目标节点
 * @param workflow 工作流
 * @returns 输入流
 */
function getNodeInput(node: INode, workflow: WorkflowGraphAst): Observable<any> {
    const edges = workflow.edges.filter(e => e.to === node.id);

    if (edges.length === 0) {
        return of({});
    }

    const streams = edges.map(edge => {
        const source = workflow.nodes.find(n => n.id === edge.from);
        if (!source) return of({});

        const output = (source as any)[edge.fromProperty!];
        if (output instanceof BehaviorSubject) {
            return output.asObservable().pipe(
                map(v => ({ [edge.toProperty!]: v }))
            );
        } else {
            return of({ [edge.toProperty!]: output });
        }
    });

    return streams.length === 1
        ? streams[0]!
        : combineLatest(streams).pipe(
              map(vals => Object.assign({}, ...vals))
          );
}

/**
 * 运行整个工作流
 *
 * @param workflow 工作流
 * @param input$ 用户输入流
 * @returns 最终输出流
 *
 * 示例：
 * runWorkflow(workflow, of({ text: 'hello' })).subscribe(output => {
 *     console.log('Result:', output);
 * })
 */
export function runWorkflow(
    workflow: WorkflowGraphAst,
    input$: Observable<any> = of({})
): Observable<any> {
    // Step 1: 初始化所有 @Output 为 BehaviorSubject
    workflow.nodes.forEach(node => {
        node.metadata?.outputs.forEach(output => {
            const key = output.property;
            if (!((node as any)[key] instanceof BehaviorSubject)) {
                (node as any)[key] = new BehaviorSubject(null);
            }
        });
    });

    // Step 2: 为每个节点连接输入流并执行
    workflow.nodes.forEach(node => {
        // 起始节点的输入来自 input$，其他节点的输入根据入边聚合
        const nodeInput$ = workflow.entryNodeIds.includes(node.id)
            ? input$
            : getNodeInput(node, workflow);

        // 执行节点
        run(node, nodeInput$).subscribe({
            error: err => console.error(`Node ${node.id} error:`, err)
        });
    });

    // Step 3: 找到结束节点并聚合输出
    const endNodes = workflow.nodes.filter(n =>
        workflow.endNodeIds.includes(n.id)
    );

    const outputs = endNodes.map(node => {
        const prop = node.metadata?.outputs[0]?.property || 'output';
        const out = (node as any)[prop];
        return out instanceof BehaviorSubject
            ? out.asObservable()
            : of(out);
    });

    // Step 4: 返回最终输出流
    return outputs.length === 1 ? outputs[0]! : merge(...outputs);
}

// ============================================================
// 导出
// ============================================================

export { run as runNode };
