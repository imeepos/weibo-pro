import { Injectable } from '@sker/core'
import { Handler, MergeAst, type MergeMode } from '@sker/workflow'
import { Observable } from 'rxjs'

@Injectable()
export class MergeAstVisitor {
    @Handler(MergeAst)
    handler(ast: MergeAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            let inputs = ast.inputs || []
            if (!Array.isArray(inputs)) {
                inputs = [inputs]
            }

            const result = this.merge(inputs, ast.mode)

            ast.result.next(result)
            ast.totalCount.next(result.length)

            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }

    private merge(inputs: any[], mode: MergeMode): any[] {
        switch (mode) {
            case 'append':
                return this.appendMerge(inputs)
            case 'combine':
                return this.combineMerge(inputs)
            case 'chooseBranch':
                return this.chooseBranchMerge(inputs)
            case 'wait':
            default:
                return this.appendMerge(inputs)
        }
    }

    private appendMerge(inputs: any[]): any[] {
        return inputs.flat()
    }

    private combineMerge(inputs: any[]): any[] {
        const arrays = inputs.map(input =>
            Array.isArray(input) ? input : [input]
        )

        if (arrays.length === 0) return []

        const maxLen = Math.max(...arrays.map(arr => arr.length))
        const result: any[] = []

        for (let i = 0; i < maxLen; i++) {
            const combined: Record<number, any> = {}
            arrays.forEach((arr, idx) => {
                if (i < arr.length) {
                    combined[idx] = arr[i]
                }
            })
            result.push(combined)
        }

        return result
    }

    private chooseBranchMerge(inputs: any[]): any[] {
        for (const input of inputs) {
            const arr = Array.isArray(input) ? input : [input]
            if (arr.length > 0 && arr.some(v => v != null)) {
                return arr
            }
        }
        return []
    }
}
