import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { CollectorAst } from "@sker/workflow-ast";
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
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });

            // IS_BUFFER 模式已在流层面处理，这里直接使用收集的数据
            // 展平多层嵌套的数组（处理 IS_MULTI | IS_BUFFER 组合导致的过度嵌套）
            ast.state = 'emitting';

            let items = ast.items || [];
            // 如果是多层嵌套的数组，展平一层
            if (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
                items = items.flat();
            }

            ast.result = items;

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
