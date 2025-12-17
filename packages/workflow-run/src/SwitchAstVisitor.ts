import { Handler, type DynamicOutput, ROUTE_SKIPPED, NodeEvent, setAstError } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, input$: Observable<any>, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消');
                    }

                    const inputValue = ast.value
                    const outputs = ast.metadata.outputs

                    // 分离 default 分支和普通分支
                    const defaultOutput = outputs.find(o =>
                        o.isRouter && (o.condition === 'true' || o.property === 'output_default')
                    )
                    const normalOutputs = outputs.filter(o =>
                        o.isRouter && o.condition && o.condition !== 'true' && o.property !== 'output_default'
                    )

                    // 先评估所有普通分支，找出匹配的
                    let anyMatched = false
                    const emitData: Record<string, any> = {}

                    normalOutputs.forEach(outputMeta => {
                        const propKey = String(outputMeta.property)
                        const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue })

                        if (matched) {
                            anyMatched = true
                            emitData[propKey] = inputValue
                        } else {
                            // 条件不匹配：使用 ROUTE_SKIPPED 明确表示"这条路不走"
                            emitData[propKey] = ROUTE_SKIPPED
                        }
                    })

                    // default 分支：只有当所有普通分支都不匹配时才激活
                    if (defaultOutput) {
                        const propKey = String(defaultOutput.property)
                        // 有其他分支匹配时，default 使用 ROUTE_SKIPPED
                        emitData[propKey] = anyMatched ? ROUTE_SKIPPED : inputValue
                    }

                    // 返回路由结果事件
                    return [
                        { type: 'node_emit' as const, id: ast.id, data: emitData }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    private evaluateCondition(condition: string, context: any): boolean {
        try {
            const func = new Function(
                ...Object.keys(context),
                `return ${condition}`
            )
            return func(...Object.values(context))
        } catch {
            return false
        }
    }
}
