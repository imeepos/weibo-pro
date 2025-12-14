import { Injectable } from "@sker/core";
import { Handler, TextAreaAst, NodeEvent } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            const outputValue = Array.isArray(ast.input) ? ast.input.join('\n') : ast.input;
            obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: outputValue })

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast })
            obs.complete()
        })
    }
}