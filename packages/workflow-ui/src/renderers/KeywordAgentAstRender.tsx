import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { KeywordAgentAst } from '@sker/workflow-ast'
import React from 'react'

const KeywordAgentComponent: React.FC<{ ast: KeywordAgentAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium text-foreground">关键词分析专家</span>
            </div>
            {ast.topic && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">分析主题:</span>
                    <p className="text-foreground line-clamp-2">{ast.topic}</p>
                </div>
            )}
            {ast.coreKeywords.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">核心关键词:</span>
                    <div className="flex flex-wrap gap-1">
                        {ast.coreKeywords.slice(0, 5).map((keyword, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded text-[10px]">
                                {keyword}
                            </span>
                        ))}
                        {ast.coreKeywords.length > 5 && (
                            <span className="text-muted-foreground text-[10px]">+{ast.coreKeywords.length - 5}</span>
                        )}
                    </div>
                </div>
            )}
            {ast.hotWords.length > 0 && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">网络热词:</span>
                    <div className="flex flex-wrap gap-1">
                        {ast.hotWords.slice(0, 4).map((word, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded text-[10px]">
                                {word}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class KeywordAgentAstRender {
    @Render(KeywordAgentAst)
    render(ast: KeywordAgentAst, _ctx: any) {
        return <KeywordAgentComponent ast={ast} />
    }
}
