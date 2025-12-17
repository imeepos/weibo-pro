import { Ast, setAstError, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, Handler, IS_MULTI } from "./decorator";
import { Injectable } from "@sker/core";
import { isObservable, Observable } from "rxjs";
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

        console.log(`[TextAreaAstVisitor] 节点 ${ast.id} Handler 被调用`);

        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });
            console.log(`[TextAreaAstVisitor] 节点 ${ast.id} 发射 node_runing`);
            input$.subscribe({
                next: (input) => {
                    console.log(`[TextAreaAstVisitor] 节点 ${ast.id} input$ 发射值:`, input);
                    // 处理输入
                    let inputArray: string[];
                    if (Array.isArray(input.input)) {
                        inputArray = input.input;
                    } else if (typeof input.input === 'string') {
                        inputArray = input.input ? [input.input] : [];
                    } else {
                        inputArray = [];
                    }

                    // 生成输出
                    const value = inputArray.join('\n');
                    ast.output = value;
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, property: 'output', value });
                    console.log(`[TextAreaAstVisitor] 节点 ${ast.id} 发射 node_emit, output="${value}"`);
                },
                error: (error) => {
                    console.error(`[TextAreaAstVisitor] 节点 ${ast.id} 发生错误:`, error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: () => {
                    console.log(`[TextAreaAstVisitor] 节点 ${ast.id} input$ 完成`);
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });
        });
    }
}