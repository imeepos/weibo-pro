import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { LastAst } from '@sker/workflow-ast'
import React from 'react'

const LastComponent: React.FC<{ ast: LastAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.input !== null && ast.input !== undefined && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">输入:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto">
                        {JSON.stringify(ast.input, null, 2).slice(0, 100)}
                        {JSON.stringify(ast.input, null, 2).length > 100 && '...'}
                    </pre>
                </div>
            )}
            {ast.last !== null && ast.last !== undefined && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">最后值:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto">
                        {JSON.stringify(ast.last, null, 2).slice(0, 100)}
                        {JSON.stringify(ast.last, null, 2).length > 100 && '...'}
                    </pre>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class LastAstRender {
    @Render(LastAst)
    render(ast: LastAst, _ctx: any) {
        return <LastComponent ast={ast} />
    }
}
