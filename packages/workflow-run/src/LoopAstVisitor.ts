import { Injectable } from '@sker/core'
import { Handler, LoopAst } from '@sker/workflow'
import { Observable } from 'rxjs'

/**
 * 循环节点执行器
 *
 * 逐个发射数组元素，支持批量和延迟控制
 */
@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    handler(ast: LoopAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            let items: any[] = ast.items || []
            if (!Array.isArray(items)) {
                items = [items]
            }
            items = items.flat().filter(v => v != null)

            const batchSize = Math.max(1, ast.batchSize || 1)
            const delay = Math.max(0, ast.delay || 0)
            const total = items.length

            ast.total.next(total)
            ast.done.next(false)
            obs.next({ ...ast })

            if (total === 0) {
                ast.done.next(true)
                ast.state = 'success'
                obs.next({ ...ast })
                obs.complete()
                return
            }

            const emitBatch = (startIndex: number) => {
                const endIndex = Math.min(startIndex + batchSize, total)
                const batch = batchSize === 1
                    ? items[startIndex]
                    : items.slice(startIndex, endIndex)

                ast.index.next(startIndex)
                ast.current.next(batch)
                obs.next({ ...ast })

                const nextIndex = endIndex
                if (nextIndex < total) {
                    if (delay > 0) {
                        setTimeout(() => emitBatch(nextIndex), delay)
                    } else {
                        emitBatch(nextIndex)
                    }
                } else {
                    ast.done.next(true)
                    ast.state = 'success'
                    obs.next({ ...ast })
                    obs.complete()
                }
            }

            emitBatch(0)
        })
    }
}
