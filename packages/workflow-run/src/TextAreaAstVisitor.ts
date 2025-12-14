import { Injectable } from "@sker/core";
import { Handler, NodeEvent, TextAreaAst, WorkflowGraphAst } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            // 直接通过 BehaviorSubject 发射输出值
            let outputValue: string;
            if (Array.isArray(ast.input)) {
                outputValue = ast.input.join('\n');
            } else if (typeof ast.input === 'object' && ast.input !== null) {
                outputValue = JSON.stringify(ast.input);
            } else {
                outputValue = ast.input;
            }
            obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: outputValue })

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast })
            obs.complete()
        })
    }
}