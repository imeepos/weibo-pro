import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LlmTextImage2ToVideoAst } from '@sker/workflow-ast'
import React from 'react'

const LlmTextImage2ToVideoComponent: React.FC<{ ast: LlmTextImage2ToVideoAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.prompt.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">提示词:</span>
                    <p className="text-foreground line-clamp-2">{ast.prompt.join('\n')}</p>
                </div>
            )}
            {(ast.first_image || ast.last_image) && (
                <div className="flex gap-2">
                    {ast.first_image && (
                        <div className="space-y-1 flex-1">
                            <span className="text-muted-foreground text-[10px]">首帧:</span>
                            <img src={ast.first_image} alt="First frame" className="w-full h-16 rounded object-cover" />
                        </div>
                    )}
                    {ast.last_image && (
                        <div className="space-y-1 flex-1">
                            <span className="text-muted-foreground text-[10px]">尾帧:</span>
                            <img src={ast.last_image} alt="Last frame" className="w-full h-16 rounded object-cover" />
                        </div>
                    )}
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
export class LlmTextImage2ToVideoAstRender {
    @Render(LlmTextImage2ToVideoAst)
    render(ast: LlmTextImage2ToVideoAst, _ctx: any) {
        return <LlmTextImage2ToVideoComponent ast={ast} />
    }
}
