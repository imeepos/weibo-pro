import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { CollectorAst } from "@sker/workflow";
import { Observable } from "rxjs";

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
