import { Observable } from "rxjs";
import { INode } from "./types";


export class DefaultVisitor {
    visit(ast: INode): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });

            // 不再需要 emitting 状态，BehaviorSubject 模式直接发射值
            
            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}