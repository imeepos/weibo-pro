import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { AgentConfigAst } from "@sker/workflow-ast";
import React from "react";
import { Badge } from "@sker/ui/components/ui/badge";

/**
 * Agent 配置节点渲染器
 */
@Injectable()
export class AgentConfigAstRender {
    @Render(AgentConfigAst)
    render(ast: AgentConfigAst) {
        return (
            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{ast.name || 'Agent'}</span>
                    <Badge variant="outline" className="text-xs">
                        {ast.model.split('/').pop() || ast.model}
                    </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                    <div>温度: {ast.temperature}</div>
                    <div className="truncate" title={ast.systemPrompt}>
                        提示词: {ast.systemPrompt.slice(0, 30)}...
                    </div>
                </div>
            </div>
        );
    }
}
