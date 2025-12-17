import { Injectable } from '@sker/core'
import { Handler, MergeAst, NodeEvent, type MergeMode } from '@sker/workflow'
import { Observable } from 'rxjs'

/**
 * 合并节点执行器
 */
@Injectable()
export class MergeAstVisitor {
    @Handler(MergeAst)
    visit(ast: MergeAst, input$: Observable<any>, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            input$.subscribe({
                next: () => {
                    ast.emitCount +=1;
                    let inputs = ast.inputs || [];
                    if (!Array.isArray(inputs)) {
                        inputs = [inputs];
                    }

                    const result = this.merge(inputs, ast.mode);

                    ast.result = result;
                    ast.totalCount = result.length;
                    obs.next({ type: 'node_emit', id: ast.id, data: { result: ast.result, totalCount: ast.totalCount } });
                },
                error: (error) => {
                    ast.state = 'fail';
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });
        });
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

    /**
     * 追加模式：所有数据拼接
     * [[a, b], [c, d]] → [a, b, c, d]
     */
    private appendMerge(inputs: any[]): any[] {
        return inputs.flat()
    }

    /**
     * 组合模式：按索引配对
     * [[a1, a2], [b1, b2]] → [{0: a1, 1: b1}, {0: a2, 1: b2}]
     */
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

    /**
     * 选择分支模式：取第一个非空分支
     */
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
