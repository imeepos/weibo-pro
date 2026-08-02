import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmTextToVideoAst } from '@sker/workflow-ast'
import React from 'react'

const LlmTextToVideoComponent: React.FC<{ ast: LlmTextToVideoAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.prompt.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">提示词:</span>
                    <p className="text-foreground line-clamp-3">{ast.prompt.join('\n')}</p>
                </div>
            )}
            {ast.video && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">生成视频:</span>
                    <video src={ast.video} controls className="w-full h-auto rounded max-h-[120px]" />
                </div>
            )}
            {!ast.video && ast.prompt.length === 0 && (
                <div className="text-muted-foreground italic text-[10px]">等待输入...</div>
            )}
        </div>
    )
}

@Injectable()
export class LlmTextToVideoAstRender {
    @Render(LlmTextToVideoAst)
    render(ast: LlmTextToVideoAst, _ctx: any) {
        return <LlmTextToVideoComponent ast={ast} />
    }
}
