import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { GroupChatLoopAst } from "@sker/workflow-ast";
import React from "react";

/**
 * 循环群聊节点渲染器
 *
 * 展示内容：
 * - 配置信息（参与者、话题、轮数）
 * - 进度条（当前轮次/总轮数）
 * - 实时对话历史
 */
@Injectable()
export class GroupChatLoopAstRender {
    @Render(GroupChatLoopAst)
    render(ast: GroupChatLoopAst) {
        return (<></>);
    }
}
