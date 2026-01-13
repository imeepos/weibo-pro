import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { TransformAst } from '@sker/workflow-ast'
import React from 'react'

const TransformComponent: React.FC<{ ast: TransformAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.expression && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">转换表达式:</span>
                    <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded block break-all">
                        {ast.expression}
                    </code>
                </div>
            )}
            {ast.input !== null && ast.input !== undefined && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">输入:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto">
                        {JSON.stringify(ast.input, null, 2).slice(0, 100)}
                        {JSON.stringify(ast.input, null, 2).length > 100 && '...'}
                    </pre>
                </div>
            )}
            {ast.output !== null && ast.output !== undefined && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">输出:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto">
                        {JSON.stringify(ast.output, null, 2).slice(0, 100)}
                        {JSON.stringify(ast.output, null, 2).length > 100 && '...'}
                    </pre>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class TransformAstRender {
    @Render(TransformAst)
    render(ast: TransformAst, ctx: any) {
        return <TransformComponent ast={ast} />
    }
}
