import { Ast } from "./ast";
import { Input, Node, Output, IS_BUFFER, IS_MULTI, Handler } from "./decorator";
import { BehaviorSubject } from "rxjs";

/**
 * 收集器节点 - 演示 IS_BUFFER 模式
 *
 * 用例：收集上游节点的所有发射
 * - IS_BUFFER：收集单边的多次发射
 * - IS_MULTI | IS_BUFFER：收集所有边的所有发射
 */
@Node({ title: '收集器', type: 'basic' })
export class CollectorAst extends Ast {
    /**
     * 使用 IS_BUFFER 模式：收集单边的所有发射
     *
     * 示例：
     * 结果：items = [item1, item2, item3]
     */
    @Input({ title: '数据流', mode: IS_BUFFER | IS_MULTI })
    items: any[] = [];

    @Output({ title: '收集结果' })
    result: any[] = [];

    type: 'CollectorAst' = 'CollectorAst';
}


import { Injectable } from "@sker/core";
import { Observable } from "rxjs";
import { NodeEvent } from "./execution/events";

/**
 * 收集器 Visitor - 处理 CollectorAst 节点
 *
 * 演示 IS_BUFFER 模式的使用
 */
@Injectable()
export class CollectorVisitor {
    @Handler(CollectorAst)
    handler(ast: CollectorAst, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            // IS_BUFFER 模式已在流层面处理，这里直接使用收集的数据
            let items = ast.items || [];
            // 如果是多层嵌套的数组，展平一层
            if (Array.isArray(items) && items.length > 0) {
                items = items.flat();
            }

            // 直接赋值并发射事件（新数据流模式）
            ast.result = items;
            obs.next({ type: 'node_emit', id: ast.id, property: 'result', value: ast.result });

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
        });
    }
}
