import "reflect-metadata";
import "dotenv/config";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { DataFlowManager, EdgeMode, executeAst, generateId, WorkflowGraphAst } from "@sker/workflow";
import { PostContextCollectorAst, WeiboAjaxFeedHotTimelineAst, WeiboAjaxStatusesCommentAst, WeiboAjaxStatusesLikeShowAst, WeiboAjaxStatusesRepostTimelineAst, WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import { root } from "@sker/core";

async function bootstrap() {
    const aataFlowManager = root.get(DataFlowManager)
    const hot = new WeiboAjaxFeedHotTimelineAst()
    const detail = new WeiboAjaxStatusesShowAst()

    const comment = new WeiboAjaxStatusesCommentAst()
    const repost = new WeiboAjaxStatusesRepostTimelineAst()
    const like = new WeiboAjaxStatusesLikeShowAst()

    const context = new PostContextCollectorAst()

    const ast = new WorkflowGraphAst()
    ast.name = 'dev'
    ast.addNodes([hot, detail, comment, repost, like, context])
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: hot.id, to: detail.id, fromProperty: 'mblogid', toProperty: 'mblogid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: hot.id, to: detail.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: comment.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: comment.id, fromProperty: 'mid', toProperty: 'mid' })

    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: repost.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: repost.id, fromProperty: 'mid', toProperty: 'mid' })

    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: like.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: like.id, fromProperty: 'mid', toProperty: 'mid' })

    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: context.id, fromProperty: 'mid', toProperty: 'postId' })
    // 场景：我想要 comment/repost/like 结束后触发这个 应该怎么实现

    executeAst(ast, {}).subscribe({
        next(value) {
            console.log(`工作流状态: ${value.state}`)
            console.log(value.nodes.map(it => [it.type, it.state, JSON.stringify(aataFlowManager.extractNodeOutputs(it))].join(' ')).join('\n'))
        },
        error(err) {
            console.error(err)
        },
        complete() {
            console.log(`工作流运行结束`)
            process.exit()
        },
    })
}

bootstrap()