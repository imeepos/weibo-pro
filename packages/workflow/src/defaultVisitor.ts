import { isObservable, Observable } from "rxjs";
import { INode } from "./types";
import { NodeEvent } from "./execution/events";
import { setAstError } from "./ast-utils";
import { WorkflowGraphAst } from "./ast";

export class DefaultVisitor {
    visit(ast: INode, input$: Observable<INode>, workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable(obs => {
            console.log(`DefaultVisitor run ${ast.type}`)
            if (!input$) throw new Error(`[DefaultVisitor.handler] input$ is empty`)
            if (!isObservable(input$)) throw new Error(`[DefaultVisitor.handler] input$ must be an Observable`)
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id })
            input$.subscribe({
                next: (data) => {
                    // 默认 一个输入 一个输出 输出直接等于输入
                    const emitData: Record<string, any> = {};
                    ast.metadata?.inputs.forEach(input => {
                        ast.metadata?.outputs.forEach(output => {
                            ast[output.property] = data[input.property];
                            emitData[output.property] = ast[output.property];
                        })
                    })
                    obs.next({ type: 'node_emit', id: ast.id, data: emitData })
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete();
                }
            })
        });
    }
}