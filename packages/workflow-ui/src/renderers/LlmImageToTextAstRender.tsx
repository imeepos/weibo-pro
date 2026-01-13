import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmImageToTextAst } from '@sker/workflow-ast'
import React from 'react'

const LlmImageToTextComponent: React.FC<{ ast: LlmImageToTextAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.images.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">输入图片 ({ast.images.length}):</span>
                    <div className="flex gap-1 flex-wrap">
                        {ast.images.slice(0, 3).map((img, idx) => (
                            <img key={idx} src={img} alt={`Input ${idx + 1}`} className="w-12 h-12 rounded object-cover" />
                        ))}
                        {ast.images.length > 3 && (
                            <span className="text-muted-foreground text-[10px] flex items-center">+{ast.images.length - 3}</span>
                        )}
                    </div>
                </div>
            )}
            {ast.text && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">识别结果:</span>
                    <p className="text-foreground line-clamp-4">{ast.text}</p>
                </div>
            )}
            {!ast.text && ast.images.length === 0 && (
                <div className="text-muted-foreground italic text-[10px]">等待输入...</div>
            )}
        </div>
    )
}

@Injectable()
export class LlmImageToTextAstRender {
    @Render(LlmImageToTextAst)
    render(ast: LlmImageToTextAst, ctx: any) {
        return <LlmImageToTextComponent ast={ast} />
    }
}
