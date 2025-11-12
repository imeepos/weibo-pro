import { Injectable } from "@sker/core";
import { Ast } from "./ast";
import { Handler, Input, Node, Output } from "./decorator";

@Node({ title: '文本节点' })
export class TextAst extends Ast {

    @Input({ title: '输入' })
    input!: string;

    @Output({ title: '输出' })
    output: string = ``;

    type: `TextAst` = `TextAst`
}

@Injectable()
export class TextAstVisitor {
    @Handler(TextAst)
    handler(ast: TextAst, ctx: any) {
        ast.state = 'success';
        ast.output = ast.input;
        return ast;
    }
}