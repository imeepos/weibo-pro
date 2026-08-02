import { Injectable } from '@sker/core'
import { SwitchAst } from './SwitchAst'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { Handler } from './decorator'
import { NodeEvent } from './execution/events'
import { setAstError } from './ast-utils'

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, input$: Observable<any>, _ctx: any) {
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
                        o.condition && (o.condition === 'true' || o.property === 'output_default')
                    )
                    const normalOutputs = outputs.filter(o =>
                        o.condition && o.condition !== 'true' && o.property !== 'output_default'
                    )

                    // 评估所有普通分支，只发射匹配的分支
                    let anyMatched = false
                    const events: NodeEvent[] = []

                    normalOutputs.forEach(outputMeta => {
                        const propKey = String(outputMeta.property)
                        const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue })

                        if (matched) {
                            anyMatched = true
                            // 发射 true 表示分支激活
                            events.push({
                                type: 'node_emit' as const,
                                id: ast.id,
                                data: { [propKey]: true }
                            })
                        }
                        // 不匹配的分支不发射任何值
                    })

                    // default 分支：只有当所有普通分支都不匹配时才激活
                    if (defaultOutput && !anyMatched) {
                        const propKey = String(defaultOutput.property)
                        events.push({
                            type: 'node_emit' as const,
                            id: ast.id,
                            data: { [propKey]: true }
                        })
                    }

                    // 返回所有激活的分支事件
                    return events;
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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
