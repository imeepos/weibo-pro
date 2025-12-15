import { Ast, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, IS_MULTI, Handler } from "./decorator";
import { Injectable } from "@sker/core";
import { Observable } from "rxjs";
import { NodeEvent } from "./execution/events";

@Node({ title: '文本节点', type: 'basic' })
export class TextAreaAst extends Ast {

    // 使用 IS_MULTI 聚合多条边的数据
    // 旧语法 isMulti: true 仍然有效（向后兼容）
    @Input({ title: '输入', mode: IS_MULTI, type: 'richtext', defaultValue: [] })
    input: string[] | string = []

    // 使用 BehaviorSubject 作为输出，运行时直接发射值
    @Output({ title: '输出', type: 'richtext', defaultValue: '' })
    output: string = '';

    type: `TextAreaAst` = `TextAreaAst`
}



@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id, data: ast })

            // 直接通过 BehaviorSubject 发射输出值
            let outputValue: string;
            if (Array.isArray(ast.input)) {
                outputValue = ast.input.join('\n');
            } else if (typeof ast.input === 'object' && ast.input !== null) {
                outputValue = JSON.stringify(ast.input);
            } else {
                outputValue = ast.input;
            }
            ast.output = outputValue;
            obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: outputValue })

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast })
            obs.complete()
        })
    }
}