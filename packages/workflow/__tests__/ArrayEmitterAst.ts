import { Ast, WorkflowGraphAst } from "../src/ast";
import { Input, Node, Output, Handler } from "../src/decorator";
import { Injectable } from "@sker/core";
import { Observable, from } from "rxjs";
import { NodeEvent } from "../src/execution/events";
import { concatMap } from "rxjs/operators";

/**
 * 测试用节点 - 为数组中的每个元素分别发射
 */
@Node({ title: '数组发射器', type: 'test' })
export class ArrayEmitterAst extends Ast {
    @Input({ title: '输入数组', type: 'array', defaultValue: [] })
    items: any[] = [];

    @Output({ title: '输出', type: 'any', defaultValue: null })
    output: any = null;

    type: 'ArrayEmitterAst' = 'ArrayEmitterAst';
}

@Injectable()
export class ArrayEmitterAstVisitor {
    @Handler(ArrayEmitterAst)
    handler(ast: ArrayEmitterAst, input$: Observable<ArrayEmitterAst>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            input$.pipe(
                concatMap(input => {
                    // 为数组中的每个元素分别发射
                    return from(input.items || []);
                })
            ).subscribe({
                next: (item) => {
                    ast.emitCount += 1;
                    ast.output = item;
                    obs.next({ type: 'node_emit', id: ast.id, data: { output: item } });
                },
                error: (error) => {
                    ast.state = 'fail';
                    obs.next({ type: 'node_fail', id: ast.id, error: error.message });
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
