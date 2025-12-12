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

            // 直接通过 BehaviorSubject 发射输出值
            if (Array.isArray(ast.input) && ast.input.length) {
                ast.output.next(ast.input[0]!)
            } else {
                const outputValue = Array.isArray(ast.input) ? ast.input.join('\n') : ast.input;
                ast.output.next(outputValue);
            }

            console.log(`[TextArea] 完成 ${ast.id}`, { output: ast.input });
            ast.state = 'success';
            obs.next({ ...ast })
            obs.complete()
        })
    }
}