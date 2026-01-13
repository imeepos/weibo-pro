import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { HttpRequestAst } from '@sker/workflow-ast'
import React from 'react'

const HttpRequestComponent: React.FC<{ ast: HttpRequestAst }> = ({ ast }) => {
    const methodColors: Record<string, string> = {
        GET: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
        POST: 'bg-green-500/20 text-green-700 dark:text-green-400',
        PUT: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
        DELETE: 'bg-red-500/20 text-red-700 dark:text-red-400',
        PATCH: 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
    }

    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">方法:</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${methodColors[ast.method] || 'bg-muted'}`}>
                    {ast.method}
                </span>
            </div>
            {ast.url && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">URL:</span>
                    <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded block break-all line-clamp-2">
                        {ast.url}
                    </code>
                </div>
            )}
            {ast.status > 0 && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">状态码:</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        ast.status >= 200 && ast.status < 300
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                    }`}>
                        {ast.status}
                    </span>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class HttpRequestAstRender {
    @Render(HttpRequestAst)
    render(ast: HttpRequestAst, ctx: any) {
        return <HttpRequestComponent ast={ast} />
    }
}
