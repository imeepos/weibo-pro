import { Handler, type DynamicOutput, ROUTE_SKIPPED } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import { Observable, BehaviorSubject } from 'rxjs'

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

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
                    this.setOutputValue(ast, propKey, inputValue)
                } else {
                    // 条件不匹配：使用 ROUTE_SKIPPED 明确表示"这条路不走"
                    this.setOutputValue(ast, propKey, ROUTE_SKIPPED)
                }
            })

            // default 分支：只有当所有普通分支都不匹配时才激活
            if (defaultOutput) {
                const propKey = String(defaultOutput.property)
                // 有其他分支匹配时，default 使用 ROUTE_SKIPPED
                const value = anyMatched ? ROUTE_SKIPPED : inputValue
                this.setOutputValue(ast, propKey, value)
            }

            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }

    private setOutputValue(ast: SwitchAst, propKey: string, value: any): void {
        if ((ast as any)[propKey] instanceof BehaviorSubject) {
            ;(ast as any)[propKey].next(value)
        } else {
            ;(ast as any)[propKey] = value
        }
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
