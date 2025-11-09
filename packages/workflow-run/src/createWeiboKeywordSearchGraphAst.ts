import { WorkflowGraphAst } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";

/**
 * 创建一个工作流 负责通过关键字/开始时间/结束时间 爬取帖子列表
 */
export function createWeiboKeywordSearchGraphAst(keyword: string, startDate: Date, endDate: Date = new Date()) {
    const graph = new WorkflowGraphAst()
    const ast = new WeiboKeywordSearchAst()
    ast.keyword = keyword;
    ast.startDate = startDate;
    ast.endDate = endDate;
    graph.addNode(ast)
    return graph;
}
