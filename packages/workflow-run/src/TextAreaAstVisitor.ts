import { Injectable } from "@sker/core";
import { Handler, TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";
const toString = (ast: any): string => {
    if (typeof ast === 'string') return ast;
    if (Array.isArray(ast)) {
        return ast.map(it => toString(it)).join('\n')
    }
    return JSON.stringify(ast)
}
@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any) {
        return new Observable(obs => {
            console.log('[TextAreaAstVisitor] input:', ast.input, 'type:', typeof ast.input, 'isArray:', Array.isArray(ast.input));
            ast.state = 'running'
            ast.output = ``
            obs.next({ ...ast })

            ast.state = 'emitting';
            ast.output = toString(ast.input)
            obs.next({ ...ast })

            ast.state = 'success';
            obs.next({ ...ast })
            obs.complete()
        })
    }
}