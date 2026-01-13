import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmTextImageToVideoAst } from '@sker/workflow-ast'
import React from 'react'

const LlmTextImageToVideoComponent: React.FC<{ ast: LlmTextImageToVideoAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.prompt.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">提示词:</span>
                    <p className="text-foreground line-clamp-2">{ast.prompt.join('\n')}</p>
                </div>
            )}
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
            {ast.video && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">生成视频:</span>
                    <video src={ast.video} controls className="w-full h-auto rounded max-h-[120px]" />
                </div>
            )}
        </div>
    )
}

@Injectable()
export class LlmTextImageToVideoAstRender {
    @Render(LlmTextImageToVideoAst)
    render(ast: LlmTextImageToVideoAst, ctx: any) {
        return <LlmTextImageToVideoComponent ast={ast} />
    }
}
