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
            ast.state = 'emitting';
            ast.result = {
                items: ast.items || [],
                allData: ast.allData || [],
                count: (ast.items?.length || 0) + (ast.allData?.length || 0)
            };

            console.log('[CollectorVisitor] 收集结果:', {
                itemsCount: ast.items?.length || 0,
                allDataCount: ast.allData?.length || 0,
                items: ast.items,
                allData: ast.allData
            });

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
