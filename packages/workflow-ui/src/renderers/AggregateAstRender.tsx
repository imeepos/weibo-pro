import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { AggregateAst } from '@sker/workflow-ast'
import React from 'react'

const AggregateComponent: React.FC<{ ast: AggregateAst }> = ({ ast }) => {
    const operationLabels: Record<string, string> = {
        sum: '求和',
        avg: '平均',
        min: '最小',
        max: '最大',
        count: '计数',
        concat: '连接',
        merge: '合并'
    }

    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">操作:</span>
                <span className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {operationLabels[ast.operation] || ast.operation}
                </span>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">输入数量:</span>
                <span className="text-foreground text-[10px]">{ast.inputs.length}</span>
            </div>
            {ast.result !== null && ast.result !== undefined && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">聚合结果:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto">
                        {JSON.stringify(ast.result, null, 2).slice(0, 100)}
                        {JSON.stringify(ast.result, null, 2).length > 100 && '...'}
                    </pre>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class AggregateAstRender {
    @Render(AggregateAst)
    render(ast: AggregateAst, _ctx: any) {
        return <AggregateComponent ast={ast} />
    }
}
