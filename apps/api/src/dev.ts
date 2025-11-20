import "reflect-metadata";
import "dotenv/config";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { EdgeMode, executeAst, generateId, WorkflowGraphAst } from "@sker/workflow";
import { WeiboAjaxFeedHotTimelineAst, WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";

async function bootstrap() {
    const hot = new WeiboAjaxFeedHotTimelineAst()
    const detail = new WeiboAjaxStatusesShowAst()
    const ast = new WorkflowGraphAst()
    ast.name = 'dev'
    ast.addNode(hot)
    ast.addNode(detail)
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: hot.id, to: detail.id, fromProperty: 'mblogid', toProperty: 'mblogid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: hot.id, to: detail.id, fromProperty: 'uid', toProperty: 'uid' })

    executeAst(ast, {}).subscribe({
        next(value) {
            console.log(value.nodes.map(it => [it.type, it.state].join(' ')).join(' '))
        },
    })
}

bootstrap()