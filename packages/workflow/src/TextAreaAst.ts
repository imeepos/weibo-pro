import { Ast, setAstError, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, Handler, IS_MULTI, Tool } from "./decorator";
import { Injectable } from "@sker/core";
import { isObservable, Observable } from "rxjs";
import { NodeEvent } from "./execution/events";

/**
 * 将任意类型序列化为字符串
 * 设计哲学: 优雅即简约 - 每个类型都有其最佳的字符串表达形式
 */
export const serializeToString = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;

    if (type === 'string') return value;
    if (type === 'number') return isNaN(value) ? 'NaN' : String(value);
    if (type === 'boolean') return String(value);

    if (Array.isArray(value)) {
        return value.flat().map(item => serializeToString(item)).join('\n\n');
    }

    if (type === 'object') {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }

    return String(value);
}

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
                    ast.emitCount += 1;
                    console.log(`[TextAreaAstVisitor] 节点 ${ast.id} input$ 发射值:`, input);

                    // 序列化输入: 支持任意类型
                    const output = serializeToString(input.input);
                    ast.output = output;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount, output } });
                    console.log(`[TextAreaAstVisitor] 节点 ${ast.id} 发射 node_emit, output="${output}"`);
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


@Injectable()
export class TextAreaAstTool {
    @Tool(TextAreaAst)
    handler(ast: TextAreaAst) {
        return {
            id: ast.id,
            title: ast.name || '未命名文本',
            summary: ast.description || '',
            content: ast.output || '（内容为空）',
            emitCount: ast.emitCount || 0
        }
    }
}