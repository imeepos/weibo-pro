import { Ast } from "@sker/workflow";
import { Input, Node, Output, IS_BUFFER, IS_MULTI } from "@sker/workflow";

/**
 * 收集器节点 - 演示 IS_BUFFER 模式
 *
 * 用例：收集上游节点的所有发射
 * - IS_BUFFER：收集单边的多次发射
 * - IS_MULTI | IS_BUFFER：收集所有边的所有发射
 */
@Node({ title: '收集器' })
export class CollectorAst extends Ast {
    /**
     * 使用 IS_BUFFER 模式：收集单边的所有发射
     *
     * 示例：
     * ArrayIterator (发射 3 次) → CollectorAst
     * 结果：items = [item1, item2, item3]
     */
    @Input({ title: '数据流', mode: IS_BUFFER })
    items: any[] = [];

    /**
     * 使用 IS_MULTI | IS_BUFFER 模式：收集所有边的所有发射
     *
     * 示例：
     * Source1 (发射 2 次) → CollectorAst
     * Source2 (发射 3 次) → CollectorAst
     * 结果：allData = [s1_v1, s1_v2, s2_v1, s2_v2, s2_v3]
     */
    @Input({ title: '全部数据', mode: IS_MULTI | IS_BUFFER })
    allData: any[] = [];

    @Output({ title: '收集结果' })
    result: {
        items: any[];
        allData: any[];
        count: number;
    } = { items: [], allData: [], count: 0 };

    type: 'CollectorAst' = 'CollectorAst';
}
