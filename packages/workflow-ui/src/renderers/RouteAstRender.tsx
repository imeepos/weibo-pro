import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { RouteAst } from '@sker/workflow-ast'
import React from 'react'

const RouteComponent: React.FC<{ ast: RouteAst }> = ({ ast }) => {
    const rules = (ast as any).rules || []

    return (
        <div className="px-2 py-1 text-xs space-y-1">
            {rules.length > 0 ? (
                rules.map((rule: { condition: string; output: string }, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground truncate max-w-[100px]" title={rule.output}>
                            {rule.output}:
                        </span>
                        <code className="font-mono text-foreground text-[10px] bg-muted px-1 rounded truncate max-w-[120px]" title={rule.condition}>
                            {rule.condition}
                        </code>
                    </div>
                ))
            ) : (
                <div className="text-muted-foreground italic text-[10px]">未配置路由规则</div>
            )}
            {rules.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                    <span>默认:</span>
                    <code className="font-mono text-foreground bg-muted px-1 rounded">default</code>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class RouteAstRender {
    @Render(RouteAst)
    render(ast: RouteAst, _ctx: any) {
        return <RouteComponent ast={ast} />
    }
}
