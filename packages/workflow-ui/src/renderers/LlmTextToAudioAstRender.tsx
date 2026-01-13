import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmTextToAudioAst } from '@sker/workflow-ast'
import React from 'react'

const LlmTextToAudioComponent: React.FC<{ ast: LlmTextToAudioAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.text.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">输入文本:</span>
                    <p className="text-foreground line-clamp-3">{ast.text.join('\n')}</p>
                </div>
            )}
            {ast.audio && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">合成音频:</span>
                    <audio src={ast.audio} controls className="w-full h-8" />
                </div>
            )}
            {!ast.audio && ast.text.length === 0 && (
                <div className="text-muted-foreground italic text-[10px]">等待输入...</div>
            )}
        </div>
    )
}

@Injectable()
export class LlmTextToAudioAstRender {
    @Render(LlmTextToAudioAst)
    render(ast: LlmTextToAudioAst, ctx: any) {
        return <LlmTextToAudioComponent ast={ast} />
    }
}
