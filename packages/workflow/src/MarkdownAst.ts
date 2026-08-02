import { Ast, setAstError, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, Handler, IS_MULTI, Tool } from "./decorator";
import { Injectable } from "@sker/core";
import { isObservable, Observable } from "rxjs";
import { NodeEvent } from "./execution/events";
import { serializeToString } from "./TextAreaAst";

@Node({ title: 'Markdown节点', type: 'basic' })
export class MarkdownAst extends Ast {

    @Input({ title: '输入', type: 'richtext', mode: IS_MULTI, defaultValue: [] })
    input: string[] = []

    @Output({ title: '输出', type: 'richtext', defaultValue: '' })
    output: string = '';

    type: `MarkdownAst` = `MarkdownAst`
}

@Injectable()
export class MarkdownAstVisitor {
    @Handler(MarkdownAst)
    handler(ast: MarkdownAst, input$: Observable<MarkdownAst>, _ctx: WorkflowGraphAst): Observable<NodeEvent> {
        if (!input$) throw new Error(`[MarkdownAstVisitor.handler] input$ is empty`)
        if (!isObservable(input$)) throw new Error(`[MarkdownAstVisitor.handler] input$ must be an Observable`)
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });
            input$.subscribe({
                next: (input) => {
                    ast.emitCount += 1;
                    const output = serializeToString(input.input);
                    ast.output = output;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount, output } });
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });
        });
    }
}


@Injectable()
export class MarkdownAstTool {
    @Tool(MarkdownAst)
    handler(ast: MarkdownAst) {
        return {
            id: ast.id,
            title: ast.name || '未命名Markdown',
            summary: ast.description || '',
            content: ast.output || '（内容为空）',
            emitCount: ast.emitCount || 0
        }
    }
}
