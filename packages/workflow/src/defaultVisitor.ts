import { Observable } from "rxjs";
import { INode } from "./types";
import { NodeEvent } from "./execution/events";
import { setAstError } from "./ast-utils";
import { WorkflowGraphAst } from "./ast";

export class DefaultVisitor {
    visit(ast: INode, input$: Observable<INode>, workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            input$.subscribe({
                next: (input) => {
                    ast.metadata?.outputs.map(output => {
                        obs.next({ type: 'node_emit', id: ast.id, property: output.property, value: input[output.property] })
                    })
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, data: ast })
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id, data: ast })
                    obs.complete();
                }
            })

        });
    }
}