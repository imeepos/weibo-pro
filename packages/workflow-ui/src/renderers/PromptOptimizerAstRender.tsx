import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { PromptOptimizerAst } from '@sker/workflow-ast'
import React from 'react'

const PromptOptimizerComponent: React.FC<{ ast: PromptOptimizerAst }> = ({ ast }) => {
    const scoreColor = ast.bestScore >= ast.targetScore
        ? 'bg-green-500/20 text-green-700 dark:text-green-400'
        : ast.bestScore >= ast.targetScore * 0.8
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
        : 'bg-red-500/20 text-red-700 dark:text-red-400'

    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">迭代进度:</span>
                <span className="text-foreground text-[10px]">{ast.currentIteration} / {ast.maxIterations}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">当前分数:</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${scoreColor}`}>
                    {ast.bestScore.toFixed(1)} / {ast.targetScore}
                </span>
            </div>
            {ast.success && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-green-600 dark:text-green-400 text-[10px]">✓ 优化成功</span>
                </div>
            )}
            {ast.versionHistory.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">版本历史 ({ast.versionHistory.length}):</span>
                    <div className="space-y-0.5">
                        {ast.versionHistory.slice(-3).map((version, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">v{version.versionNumber}</span>
                                <span className="font-mono">{version.score.toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class PromptOptimizerAstRender {
    @Render(PromptOptimizerAst)
    render(ast: PromptOptimizerAst, ctx: any) {
        return <PromptOptimizerComponent ast={ast} />
    }
}
