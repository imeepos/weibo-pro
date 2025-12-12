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

            // 分离默认分支和普通分支
            const defaultOutput = outputs.find(o =>
                o.isRouter && (o.condition === 'true' || o.property === 'output_default')
            )
            const normalOutputs = outputs.filter(o =>
                o.isRouter && o.condition && o.condition !== 'true' && o.property !== 'output_default'
            )

            // 先评估普通分支，记录是否有匹配
            let anyMatched = false
            normalOutputs.forEach(outputMeta => {
                const propKey = String(outputMeta.property)
                const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue })

                if (matched) {
                    anyMatched = true
                    this.setOutputValue(ast, propKey, inputValue)
                } else {
                    this.setOutputValue(ast, propKey, ROUTE_SKIPPED)
                }
            })

            // 默认分支：只有当所有普通分支都不匹配时才激活
            if (defaultOutput) {
                const propKey = String(defaultOutput.property)
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

    /**
     * 求值条件表达式
     * 简单实现：支持 $input === value 和 true/false
     *
     * 注意：使用 new Function() 存在安全风险
     * 生产环境建议使用 expr-eval 或 jexl 等安全的表达式引擎
     */
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
