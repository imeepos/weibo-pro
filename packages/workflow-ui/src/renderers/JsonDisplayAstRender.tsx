import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { JsonDisplayAst } from '@sker/workflow-ast'
import React from 'react'

const JsonDisplayComponent: React.FC<{ ast: JsonDisplayAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            {ast.json !== null && ast.json !== undefined && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">JSON 数据:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                        {JSON.stringify(ast.json, null, 2)}
                    </pre>
                </div>
            )}
            {ast.formatted && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">格式化结果:</span>
                    <pre className="text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                        {ast.formatted}
                    </pre>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class JsonDisplayAstRender {
    @Render(JsonDisplayAst)
    render(ast: JsonDisplayAst, _ctx: any) {
        return <JsonDisplayComponent ast={ast} />
    }
}
