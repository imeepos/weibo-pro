import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmTextToImageAst } from '@sker/workflow-ast'
import React from 'react'

const LlmTextToImageComponent: React.FC<{ ast: LlmTextToImageAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.text.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">输入文本:</span>
                    <p className="text-foreground line-clamp-3">{ast.text.join('\n')}</p>
                </div>
            )}
            {ast.image && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">生成图片:</span>
                    <img src={ast.image} alt="Generated" className="w-full h-auto rounded max-h-[120px] object-cover" />
                </div>
            )}
            {!ast.image && ast.text.length === 0 && (
                <div className="text-muted-foreground italic text-[10px]">等待输入...</div>
            )}
        </div>
    )
}

@Injectable()
export class LlmTextToImageAstRender {
    @Render(LlmTextToImageAst)
    render(ast: LlmTextToImageAst, ctx: any) {
        return <LlmTextToImageComponent ast={ast} />
    }
}
