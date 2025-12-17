import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { ShareAst, ChatMessage } from "@sker/workflow-ast";
import { Observable, concatMap } from "rxjs";
import { executeRemote } from "./execute-remote.js";
import { handlerRemote } from './execute-remote.js';

/**
 * 群聊节点执行器 - 收集和组织消息
 *
 * 职责：
 * - 收集所有上游节点的消息（通过 IS_BUFFER | IS_MULTI）
 * - 组织成对话历史格式（ChatMessage[]）
 * - 输出历史记录供下游节点使用
 *
 * 注意：
 * - 每个上游消息会自动标记为 "Agent N"
 * - 如果需要自定义角色名，上游节点应该输出格式化的文本："[角色名]: 内容"
 */
@Injectable()
export class ShareAstVisitor {
    @Handler(ShareAst)
    handler(ast: ShareAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
        return handlerRemote(ast, $input, ctx)
    }
}
