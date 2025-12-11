import { Ast } from "@sker/workflow";
import { Input, Node, Output, IS_BUFFER, IS_MULTI } from "@sker/workflow";
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
    result: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

    type: 'CollectorAst' = 'CollectorAst';
}
