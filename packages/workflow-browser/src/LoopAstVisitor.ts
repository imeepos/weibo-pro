import { Injectable } from '@sker/core'
import { Handler, LoopAst, NodeEvent } from '@sker/workflow'
import { Observable } from 'rxjs'

@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    handler(ast: LoopAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            let items: any[] = ast.items || []
            if (!Array.isArray(items)) {
                items = [items]
            }
            items = items.flat().filter(v => v != null)

            const batchSize = Math.max(1, ast.batchSize || 1)
            const delay = Math.max(0, ast.delay || 0)
            const total = items.length

            obs.next({ type: 'node_emit', id: ast.id, property: 'total', value: total })
            obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: false })

            if (total === 0) {
                obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: true })
                ast.state = 'success'
                obs.next({ type: 'node_success', id: ast.id, data: ast })
                obs.complete()
                return
            }

            const emitBatch = (startIndex: number) => {
                const endIndex = Math.min(startIndex + batchSize, total)
                const batch = batchSize === 1
                    ? items[startIndex]
                    : items.slice(startIndex, endIndex)

                obs.next({ type: 'node_emit', id: ast.id, property: 'index', value: startIndex })
                obs.next({ type: 'node_emit', id: ast.id, property: 'current', value: batch })

                const nextIndex = endIndex
                if (nextIndex < total) {
                    if (delay > 0) {
                        setTimeout(() => emitBatch(nextIndex), delay)
                    } else {
                        emitBatch(nextIndex)
                    }
                } else {
                    obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: true })
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id, data: ast })
                    obs.complete()
                }
            }

            emitBatch(0)
        })
    }
}
