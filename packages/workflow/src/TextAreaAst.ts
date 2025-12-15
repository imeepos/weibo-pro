import { Ast, setAstError, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, Handler, IS_MULTI } from "./decorator";
import { Injectable } from "@sker/core";
import { catchError, concatMap, isObservable, Observable, of } from "rxjs";
import { NodeEvent } from "./execution/events";

@Node({ title: '文本节点', type: 'basic' })
export class TextAreaAst extends Ast {

    @Input({ title: '输入', type: 'richtext', mode: IS_MULTI, defaultValue: [] })
    input: string[] = []

    @Output({ title: '输出', type: 'richtext', defaultValue: '' })
    output: string = '';

    type: `TextAreaAst` = `TextAreaAst`
}

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, input$: Observable<TextAreaAst>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        if (!input$) throw new Error(`[TextAreaAstVisitor.handler] input$ is empty`)
        if (!isObservable(input$)) throw new Error(`[TextAreaAstVisitor.handler] input$ must be an Observable`)
        return input$.pipe(
            concatMap((input: TextAreaAst) => {
                // 健壮性处理：支持 input.input 是数组或字符串
                let inputArray: string[];
                if (Array.isArray(input.input)) {
                    inputArray = input.input;
                } else if (typeof input.input === 'string') {
                    inputArray = input.input ? [input.input] : [];
                } else {
                    inputArray = [];
                }

                const value = inputArray.join('\n');
                const events: NodeEvent[] = [
                    { type: 'node_runing', id: ast.id, data: { ...ast, state: 'running' } },
                    { type: 'node_emit', id: ast.id, property: 'output', value },
                    { type: 'node_success', id: ast.id, data: { ...ast, state: 'success', output: value } }
                ];
                return events;
            }),
            catchError(error => {
                ast.state = 'fail';
                setAstError(ast, error);
                return of({ type: 'node_fail', id: ast.id, data: ast } as NodeEvent);
            })
        );
    }
}