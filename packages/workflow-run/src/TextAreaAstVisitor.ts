import { Injectable } from "@sker/core";
import { Handler, TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any): Observable<TextAreaAst> {
        return new Observable<TextAreaAst>(obs => {
            ast.state = 'running'
            obs.next(ast)

            // 直接通过 BehaviorSubject 发射输出值
            let outputValue: string;
            if (Array.isArray(ast.input)) {
                outputValue = ast.input.join('\n');
            } else if (typeof ast.input === 'object' && ast.input !== null) {
                outputValue = JSON.stringify(ast.input);
            } else {
                outputValue = ast.input;
            }
            ast.output.next(outputValue);

            ast.state = 'success';
            obs.next(ast)
            obs.complete()
        })
    }
}