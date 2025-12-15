import { Injectable } from '@sker/core'
import { Handler, LoopAst, NodeEvent } from '@sker/workflow'
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
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            let items: any[] = ast.items || []
            if (!Array.isArray(items)) {
                items = [items]
            }
            items = items.flat().filter(v => v != null)

            const batchSize = Math.max(1, ast.batchSize || 1)
            const delay = Math.max(0, ast.delay || 0)
            const total = items.length

            ast.total = total
            ast.done = false
            obs.next({ type: 'node_emit', id: ast.id, property: 'total', value: ast.total });
            obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: ast.done });

            if (total === 0) {
                ast.done = true
                obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: ast.done });
                ast.state = 'success'
                obs.next({ type: 'node_success', id: ast.id, data: ast });
                obs.complete()
                return
            }

            const emitBatch = (startIndex: number) => {
                const endIndex = Math.min(startIndex + batchSize, total)
                const batch = batchSize === 1
                    ? items[startIndex]
                    : items.slice(startIndex, endIndex)

                ast.index = startIndex
                ast.current = batch
                obs.next({ type: 'node_emit', id: ast.id, property: 'index', value: ast.index });
                obs.next({ type: 'node_emit', id: ast.id, property: 'current', value: ast.current });

                const nextIndex = endIndex
                if (nextIndex < total) {
                    if (delay > 0) {
                        setTimeout(() => emitBatch(nextIndex), delay)
                    } else {
                        emitBatch(nextIndex)
                    }
                } else {
                    ast.done = true
                    obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: ast.done });
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id, data: ast });
                    obs.complete()
                }
            }

            emitBatch(0)
        })
    }
}
