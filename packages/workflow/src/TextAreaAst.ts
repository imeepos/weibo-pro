import { Ast, setAstError, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, IS_MULTI, Handler } from "./decorator";
import { Injectable } from "@sker/core";
import { catchError, concatMap, merge, Observable, of, switchMap } from "rxjs";
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
    handler(ast: TextAreaAst, input$: Observable<TextAreaAst>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        // 优先使用节点自身的 input 属性作为默认值
        const defaultValue = ast.input !== undefined ? ast.input : [];
        const source$ = input$ || of(defaultValue);

        return source$.pipe(
            concatMap(input => {
                console.log(`TextAreaAstVisitor source`, input)
                console.log(`TextAreaAstVisitor 节点自身的 input 属性:`, ast.input)

                // 处理输入：可能是直接值、数组，或包含属性的对象
                let values: any[] = [];

                // 如果流输入是空对象或未定义，优先使用节点自身的 input 属性
                const useInput = (typeof input === 'object' && input !== null && Object.keys(input).length > 0)
                    ? input
                    : (ast.input !== undefined ? ast.input : []);

                if (typeof useInput === 'object' && useInput !== null) {
                    // 如果是对象，提取 input 属性
                    if ('input' in useInput) {
                        const inputValue = (useInput as any).input;
                        console.log(`TextAreaAstVisitor 提取 input 属性:`, inputValue);
                        values = Array.isArray(inputValue) ? inputValue : [inputValue];
                    } else {
                        // 如果是其他对象，直接使用
                        console.log(`TextAreaAstVisitor 直接使用对象:`, useInput);
                        values = [useInput];
                    }
                } else {
                    // 直接值
                    console.log(`TextAreaAstVisitor 直接值:`, useInput);
                    values = Array.isArray(useInput) ? useInput : [useInput];
                }

                // 过滤掉 undefined/null 值
                const filteredValues = values.filter(v => v !== undefined && v !== null);
                console.log(`TextAreaAstVisitor 处理后的值:`, filteredValues);

                // 更新 ast.output 为数组
                ast.output = filteredValues.join('\n');
                console.log(`TextAreaAstVisitor 最终输出:`, ast.output);

                // 设置节点状态为 success
                ast.state = 'success';

                // 创建事件序列
                const events: NodeEvent[] = [
                    { type: 'node_runing', id: ast.id, data: ast },
                    ...filteredValues.map(value => ({ type: 'node_emit', id: ast.id, property: 'output', value } as NodeEvent)),
                    { type: 'node_success', id: ast.id, data: ast }
                ];

                return events;
            }),

            catchError(error => {
                ast.state = 'fail';
                setAstError(ast, error)
                return of({
                    type: 'node_fail',
                    id: ast.id,
                    data: ast
                } as NodeEvent);
            })
        );
    }
}