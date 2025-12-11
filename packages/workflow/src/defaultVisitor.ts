import { Observable } from "rxjs";
import { INode } from "./types";


export class DefaultVisitor {
    visit(ast: INode): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });

            ast.state = 'emitting';
            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}