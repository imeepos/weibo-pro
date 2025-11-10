import { WorkflowGraphAst } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";


export function createWeiboDetailGraphAst(mblogid: string, uid: string){
    const graph = new WorkflowGraphAst()
    const detail = new WeiboAjaxStatusesShowAst()
    detail.mblogid = mblogid;
    detail.uid = uid;
    graph.addNode(detail)
    return graph;
}