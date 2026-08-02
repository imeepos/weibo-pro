import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { QualityCheckerAst } from '@sker/workflow-ast'
import React from 'react'

const QualityCheckerComponent: React.FC<{ ast: QualityCheckerAst }> = ({ ast }) => {
    const scoreColor = ast.score >= ast.minScore
        ? 'bg-green-500/20 text-green-700 dark:text-green-400'
        : ast.score >= ast.minScore * 0.8
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
        : 'bg-red-500/20 text-red-700 dark:text-red-400'

    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">质量分数:</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${scoreColor}`}>
                    {ast.score.toFixed(1)} / 100
                </span>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">最低要求:</span>
                <span className="text-muted-foreground text-[10px]">{ast.minScore} 分</span>
            </div>
            {ast.result && (
                <>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">状态:</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            ast.passed
                                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                                : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                            {ast.passed ? '✓ 通过' : '✗ 未通过'}
                        </span>
                    </div>
                    {ast.result.dimensions.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/50">
                            <span className="text-muted-foreground text-[10px]">维度评分:</span>
                            <div className="space-y-0.5">
                                {ast.result.dimensions.map((dim, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground truncate max-w-[80px]" title={dim.name}>
                                            {dim.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-12 h-1 bg-muted rounded overflow-hidden">
                                                <div
                                                    className="h-full bg-foreground"
                                                    style={{ width: `${dim.score}%` }}
                                                />
                                            </div>
                                            <span className="font-mono text-[9px] w-6 text-right">{dim.score.toFixed(0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

@Injectable()
export class QualityCheckerAstRender {
    @Render(QualityCheckerAst)
    render(ast: QualityCheckerAst, _ctx: any) {
        return <QualityCheckerComponent ast={ast} />
    }
}
