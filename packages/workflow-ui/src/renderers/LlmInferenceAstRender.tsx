import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmInferenceAst } from '@sker/workflow-ast'
import React from 'react'

const LlmInferenceComponent: React.FC<{ ast: LlmInferenceAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">模型:</span>
                <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[140px]" title={ast.model}>
                    {ast.model}
                </code>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">温度:</span>
                <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {ast.temperature}
                </code>
            </div>
            {(ast.system.length > 0 || ast.prompt.length > 0) && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    {ast.system.length > 0 && (
                        <div className="text-[10px]">
                            <span className="text-muted-foreground">系统:</span>
                            <p className="text-foreground mt-0.5 line-clamp-2">{ast.system.join('\n')}</p>
                        </div>
                    )}
                    {ast.prompt.length > 0 && (
                        <div className="text-[10px]">
                            <span className="text-muted-foreground">提示:</span>
                            <p className="text-foreground mt-0.5 line-clamp-2">{ast.prompt.join('\n')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

@Injectable()
export class LlmInferenceAstRender {
    @Render(LlmInferenceAst)
    render(ast: LlmInferenceAst, _ctx: any) {
        return <LlmInferenceComponent ast={ast} />
    }
}
