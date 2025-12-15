import { Injectable } from "@sker/core";
import { DateAst, Handler, NodeEvent, TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class DateAstVisitor {
    @Handler(DateAst)
    handler(ast: DateAst, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            ast.date = new Date(ast.dateStr);
            obs.next({ type: 'node_emit', id: ast.id, property: 'date', value: ast.date });

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete()
        })
    }
}