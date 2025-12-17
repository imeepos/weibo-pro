import { Ast, WorkflowGraphAst } from "./ast";
import { Input, Node, Output, IS_BUFFER, IS_MULTI, Handler } from "./decorator";

@Node({ title: '收集器', type: 'basic' })
export class CollectorAst extends Ast {
    @Input({ title: '数据流', mode: IS_BUFFER | IS_MULTI })
    items: any[] = [];

    @Output({ title: '收集结果' })
    result: any[] = [];

    type: 'CollectorAst' = 'CollectorAst';
}


import { Injectable } from "@sker/core";
import { Observable, map, tap, toArray } from "rxjs";
import { NodeEvent } from "./execution/events";

@Injectable()
export class CollectorVisitor {
    @Handler(CollectorAst)
    handler(ast: CollectorAst, input$: Observable<CollectorAst>, ctx: WorkflowGraphAst) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });
            input$.pipe(
                toArray(),
                map(asts => asts.flatMap(a => a.items || []).flat()),
                tap(items => {
                    ast.result = items;
                    obs.next({ type: 'node_emit', id: ast.id, property: 'result', value: items });
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                })
            ).subscribe({
                complete: () => obs.complete()
            });
        });
    }
}
