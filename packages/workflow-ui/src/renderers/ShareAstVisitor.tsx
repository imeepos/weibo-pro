import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { ShareAst } from "@sker/workflow-ast";
import React from "react";

/**
 * 群聊节点渲染器
 * 
 * 功能列表：
 * 1. 实现一个 + 号功能，点击后选择添加的节点
 * 2. 实现群内列表展示，可以踢出某人
 * 3. 实现拖拽排序 
 * 4. 尽量服用@sker/ui中相关组件
 * 5. 排序代表发言顺序
 * 6. 可以设置会议时长
 */
@Injectable()
export class ShareAstVisitor {
    @Render(ShareAst)
    render(ast: ShareAst) {
        return (<></>);
    }
}