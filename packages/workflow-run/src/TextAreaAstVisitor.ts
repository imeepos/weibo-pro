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
            obs.next({ ...ast })

            // 直接通过 BehaviorSubject 发射输出值
            const outputValue = toString(ast.input);
            ast.output.next(outputValue);

            ast.state = 'success';
            obs.next({ ...ast })
            obs.complete()
        })
    }
}