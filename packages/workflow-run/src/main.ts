import "reflect-metadata";
import "dotenv/config";
import "@sker/workflow";
import "@sker/workflow-ast";
import "./index";
import { DataFlowManager, EdgeMode, executeAst, generateId, WorkflowGraphAst } from "@sker/workflow";
import { EventAutoCreatorAst, PostContextCollectorAst, PostNLPAnalyzerAst, WeiboAjaxFeedHotTimelineAst, WeiboAjaxStatusesCommentAst, WeiboAjaxStatusesLikeShowAst, WeiboAjaxStatusesRepostTimelineAst, WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import { root } from "@sker/core";

async function bootstrap() {
    const aataFlowManager = root.get(DataFlowManager)
    const hot = new WeiboAjaxFeedHotTimelineAst()
    const detail = new WeiboAjaxStatusesShowAst()

    const comment = new WeiboAjaxStatusesCommentAst()
    const repost = new WeiboAjaxStatusesRepostTimelineAst()
    const like = new WeiboAjaxStatusesLikeShowAst()

    const context = new PostContextCollectorAst()
    const nlp = new PostNLPAnalyzerAst()
    const auto = new EventAutoCreatorAst()

    const ast = new WorkflowGraphAst()
    ast.name = 'dev'
    ast.addNodes([hot, detail, comment, repost, like, context, nlp, auto])
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: hot.id, to: detail.id, fromProperty: 'mblogid', toProperty: 'mblogid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: hot.id, to: detail.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: comment.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: comment.id, fromProperty: 'mid', toProperty: 'mid' })

    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: repost.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: repost.id, fromProperty: 'mid', toProperty: 'mid' })

    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: like.id, fromProperty: 'uid', toProperty: 'uid' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: like.id, fromProperty: 'mid', toProperty: 'mid' })

    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: detail.id, to: context.id, fromProperty: 'mid', toProperty: 'postId' })

    // 等待 comment/repost/like 都完成后才触发 context
    ast.addEdge({ id: generateId(), mode: EdgeMode.COMBINE_LATEST, from: comment.id, to: context.id, fromProperty: 'is_end', toProperty: 'canStart' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.COMBINE_LATEST, from: repost.id, to: context.id, fromProperty: 'is_end', toProperty: 'canStart' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.COMBINE_LATEST, from: like.id, to: context.id, fromProperty: 'is_end', toProperty: 'canStart' })

    // context 完成后传递数据到 nlp 节点
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: context.id, to: nlp.id, fromProperty: 'post', toProperty: 'post' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: context.id, to: nlp.id, fromProperty: 'comments', toProperty: 'comments' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: context.id, to: nlp.id, fromProperty: 'reposts', toProperty: 'reposts' })

    // nlp 完成后传递数据到 auto 节点
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: nlp.id, to: auto.id, fromProperty: 'nlpResult', toProperty: 'nlpResult' })
    ast.addEdge({ id: generateId(), mode: EdgeMode.ZIP, from: context.id, to: auto.id, fromProperty: 'post', toProperty: 'post' })
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