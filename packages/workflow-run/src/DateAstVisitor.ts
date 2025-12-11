import { Injectable } from "@sker/core";
import { DateAst, Handler, TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class DateAstVisitor {
    @Handler(DateAst)
    handler(ast: DateAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })
            ast.date = new Date(ast.dateStr);

            obs.next({ ...ast })

            ast.state = 'success';
            obs.next({ ...ast })
            obs.complete()
        })
    }
}