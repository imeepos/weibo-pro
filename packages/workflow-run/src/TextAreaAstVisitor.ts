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
            console.log(`[TextArea] 执行 ${ast.id}`, { input: ast.input });

            ast.state = 'running'
            obs.next({ ...ast })

            const outputValue = toString(ast.input);
            ast.output.next(outputValue);

            console.log(`[TextArea] 完成 ${ast.id}`, { output: outputValue });

            ast.state = 'success';
            obs.next({ ...ast })
            obs.complete()
        })
    }
}