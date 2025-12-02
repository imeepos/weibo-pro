import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { ShareAst } from "@sker/workflow-ast";
import React from "react";
import { Card } from "@sker/ui/components/ui/card";

/**
 * 群聊节点渲染器
 * 显示收集到的多个 Agent 对话内容
 */
@Injectable()
export class ShareAstVisitor {
    @Render(ShareAst)
    render(ast: ShareAst) {
        // 如果没有输出，显示提示信息
        if (!ast.output || ast.output.length === 0) {
            return (
                <div className="p-4 text-sm text-muted-foreground">
                    等待接收消息...
                </div>
            );
        }

        // 显示群聊消息
        return (
            <div className="space-y-2 p-4 max-h-[300px] overflow-y-auto">
                {ast.output.map((message, index) => (
                    <Card key={index} className="p-3">
                        <div className="text-sm whitespace-pre-wrap">
                            {message}
                        </div>
                    </Card>
                ))}
            </div>
        );
    }
}