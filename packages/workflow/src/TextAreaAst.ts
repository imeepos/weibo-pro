import { Ast, setAstError, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, Handler, IS_MULTI, Tool } from "./decorator";
import { Injectable } from "@sker/core";
import { isObservable, Observable, from } from "rxjs";
import { NodeEvent } from "./execution/events";
import { concatMap, mergeMap } from "rxjs/operators";

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

    @Input({ title: '输入', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
    input: string[] = []

    @Output({ title: '输出', type: 'textarea', defaultValue: '' })
    output: string = '';

    type: `TextAreaAst` = `TextAreaAst`
}

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, input$: Observable<TextAreaAst>, _ctx: WorkflowGraphAst): Observable<NodeEvent> {
        if (!input$) throw new Error(`[TextAreaAstVisitor.handler] input$ is empty`)
        if (!isObservable(input$)) throw new Error(`[TextAreaAstVisitor.handler] input$ must be an Observable`)
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (input) => {
                    ast.emitCount += 1;
                    // 序列化输入: 支持任意类型
                    const output = serializeToString(input.input);
                    ast.output = output;
                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount, output } }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    // 发射空数据让下游继续
                    obs.next({ type: 'node_emit', id: ast.id, data: {} });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => subscription.unsubscribe();
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