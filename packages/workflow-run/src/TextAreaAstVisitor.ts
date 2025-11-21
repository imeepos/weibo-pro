import { Injectable } from "@sker/core";
import { Handler, TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'emitting';
            ast.output = ast.input;
            obs.next({...ast})

            ast.state = 'success';
            obs.next({...ast})
            obs.complete()
        })
    }
}