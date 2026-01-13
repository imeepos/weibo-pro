import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmVideoToTextAst } from '@sker/workflow-ast'
import React from 'react'

const LlmVideoToTextComponent: React.FC<{ ast: LlmVideoToTextAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.videos.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">输入视频 ({ast.videos.length}):</span>
                    <div className="flex gap-1 flex-wrap">
                        {ast.videos.slice(0, 2).map((video, idx) => (
                            <video key={idx} src={video} className="w-20 h-14 rounded object-cover" muted />
                        ))}
                        {ast.videos.length > 2 && (
                            <span className="text-muted-foreground text-[10px] flex items-center">+{ast.videos.length - 2}</span>
                        )}
                    </div>
                </div>
            )}
            {ast.text && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">解析结果:</span>
                    <p className="text-foreground line-clamp-4">{ast.text}</p>
                </div>
            )}
            {!ast.text && ast.videos.length === 0 && (
                <div className="text-muted-foreground italic text-[10px]">等待输入...</div>
            )}
        </div>
    )
}

@Injectable()
export class LlmVideoToTextAstRender {
    @Render(LlmVideoToTextAst)
    render(ast: LlmVideoToTextAst, ctx: any) {
        return <LlmVideoToTextComponent ast={ast} />
    }
}
