import { Handler, type DynamicOutput, ROUTE_SKIPPED, NodeEvent, setAstError } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import { Observable } from 'rxjs'

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, input$: Observable<any>, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id });

            input$.subscribe({
                next: (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
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
                    normalOutputs.forEach(outputMeta => {
                        const propKey = String(outputMeta.property)
                        const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue })

                        if (matched) {
                            anyMatched = true
                            // 通过 node_emit 事件发射数据（新数据流模式）
                            obs.next({ type: 'node_emit', id: ast.id, property: propKey, value: inputValue });
                        } else {
                            // 条件不匹配：使用 ROUTE_SKIPPED 明确表示"这条路不走"
                            obs.next({ type: 'node_emit', id: ast.id, property: propKey, value: ROUTE_SKIPPED });
                        }
                    })

                    // default 分支：只有当所有普通分支都不匹配时才激活
                    if (defaultOutput) {
                        const propKey = String(defaultOutput.property)
                        // 有其他分支匹配时，default 使用 ROUTE_SKIPPED
                        const value = anyMatched ? ROUTE_SKIPPED : inputValue
                        // 通过 node_emit 事件发射数据（新数据流模式）
                        obs.next({ type: 'node_emit', id: ast.id, property: propKey, value });
                    }

                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete()
                }
            })
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
