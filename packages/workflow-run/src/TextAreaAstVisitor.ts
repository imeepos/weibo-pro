import { Injectable } from "@sker/core";
import { Handler, TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            ast.state = 'emitting';
            ast.output = Array.isArray(ast.input) ? ast.input.join('\n') : ast.input;

            obs.next({...ast})

            ast.state = 'success';
            obs.next({...ast})
            obs.complete()
        })
    }
}