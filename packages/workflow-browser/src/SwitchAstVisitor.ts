import { Handler, type DynamicOutput, ROUTE_SKIPPED, NodeEvent } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import { Observable } from 'rxjs'

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            const inputValue = ast.value
            const outputs = ast.metadata.outputs

            const defaultOutput = outputs.find(o =>
                o.isRouter && (o.condition === 'true' || o.property === 'output_default')
            )
            const normalOutputs = outputs.filter(o =>
                o.isRouter && o.condition && o.condition !== 'true' && o.property !== 'output_default'
            )

            let anyMatched = false
            normalOutputs.forEach(outputMeta => {
                const propKey = String(outputMeta.property)
                const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue })

                if (matched) {
                    anyMatched = true
                    obs.next({ type: 'node_emit', id: ast.id, property: propKey, value: inputValue })
                } else {
                    obs.next({ type: 'node_emit', id: ast.id, property: propKey, value: ROUTE_SKIPPED })
                }
            })

            if (defaultOutput) {
                const propKey = String(defaultOutput.property)
                const value = anyMatched ? ROUTE_SKIPPED : inputValue
                obs.next({ type: 'node_emit', id: ast.id, property: propKey, value })
            }

            ast.state = 'success'
            obs.next({ type: 'node_success', id: ast.id, data: ast })
            obs.complete()
        })
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
