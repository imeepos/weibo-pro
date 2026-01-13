import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { EventAuthGenerateAst } from '@sker/workflow-ast'
import React from 'react'

const EventAuthGenerateComponent: React.FC<{ ast: EventAuthGenerateAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">模型:</span>
                <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px]">
                    {ast.model}
                </code>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">温度:</span>
                <span className="text-foreground text-[10px]">{ast.temperature}</span>
            </div>
            {ast.userInput && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">用户输入:</span>
                    <p className="text-foreground line-clamp-2">{ast.userInput}</p>
                </div>
            )}
            {ast.event && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">事件:</span>
                    <p className="text-foreground line-clamp-2">{ast.event_title || ast.event_id}</p>
                </div>
            )}
            {ast.insertSuccess && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-green-600 dark:text-green-400 text-[10px]">✓ 插入成功</span>
                </div>
            )}
            {ast.alreadyExists && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-amber-600 dark:text-amber-400 text-[10px]">⚠ 事件已存在</span>
                </div>
            )}
            {ast.errorMessage && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-red-600 dark:text-red-400 text-[10px]">✗ {ast.errorMessage}</span>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class EventAuthGenerateAstRender {
    @Render(EventAuthGenerateAst)
    render(ast: EventAuthGenerateAst, ctx: any) {
        return <EventAuthGenerateComponent ast={ast} />
    }
}
