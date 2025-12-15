import { Observable } from "rxjs";
import { INode } from "./types";
import { NodeEvent } from "./execution/events";


export class DefaultVisitor {
    visit(ast: INode): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast })
            obs.complete();
        });
    }
}