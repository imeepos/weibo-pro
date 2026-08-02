import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { WorkflowNodeGeneratorAst } from '@sker/workflow-ast'
import React from 'react'

const WorkflowNodeGeneratorComponent: React.FC<{ ast: WorkflowNodeGeneratorAst }> = ({ ast }) => {
    const nodeTypeColors: Record<string, string> = {
        llm: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
        crawler: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
        control: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
        basic: 'bg-green-500/20 text-green-700 dark:text-green-400',
        analysis: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400'
    }

    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.nodeName && (
                <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">节点名称:</span>
                    <span className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px]">
                        {ast.nodeName}
                    </span>
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">节点类型:</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${nodeTypeColors[ast.nodeType] || 'bg-muted'}`}>
                    {ast.nodeType}
                </span>
            </div>
            {ast.nodeDescription && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">功能描述:</span>
                    <p className="text-foreground line-clamp-3">{ast.nodeDescription}</p>
                </div>
            )}
            {ast.success && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-green-600 dark:text-green-400 text-[10px]">✓ 生成成功</span>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class WorkflowNodeGeneratorAstRender {
    @Render(WorkflowNodeGeneratorAst)
    render(ast: WorkflowNodeGeneratorAst, _ctx: any) {
        return <WorkflowNodeGeneratorComponent ast={ast} />
    }
}
