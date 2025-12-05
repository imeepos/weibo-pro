import { Handler, type DynamicOutput } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import { Observable } from 'rxjs'

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            ast.state = 'emitting'

            // 核心路由逻辑：根据条件求值，只设置匹配的输出
            const inputValue = ast.value

            // ✨使用编译后的 node.metadata.outputs
            const outputs = ast.metadata.outputs

            // 处理装饰器定义的输出
            outputs.forEach(outputMeta => {
                const propKey = String(outputMeta.propertyKey)

                if (outputMeta.isRouter && outputMeta.condition) {
                    // 条件求值
                    const matched = this.evaluateCondition(
                        outputMeta.condition,
                        { $input: inputValue }
                    )

                    if (matched) {
                        ;(ast as any)[propKey] = inputValue
                    } else {
                        ;(ast as any)[propKey] = undefined
                    }
                }
            })

            // 处理动态输出
            const dynamicOutputs = ast.dynamicOutputs as DynamicOutput[] | undefined
            if (dynamicOutputs && dynamicOutputs.length > 0) {
                dynamicOutputs.forEach(dynamicOutput => {
                    const propKey = dynamicOutput.property

                    // 条件求值
                    const matched = this.evaluateCondition(
                        dynamicOutput.condition,
                        { $input: inputValue }
                    )

                    if (matched) {
                        ;(ast as any)[propKey] = inputValue
                    } else {
                        ;(ast as any)[propKey] = undefined
                    }
                })
            }

            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
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
