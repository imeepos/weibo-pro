import { Render } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import React from 'react'

const SwitchComponent: React.FC<{ ast: SwitchAst }> = ({ ast }) => {
    // ✨使用编译后的 node.metadata.outputs 获取路由输出
    const outputs = (ast as any).metadata?.outputs?.filter((meta: any) => meta.isRouter) || []

    return (
        <div className="px-2 py-1 text-xs space-y-1">
            {outputs.length > 0 ? (
                outputs.map((output: any, index: number) => (
                    <div key={`${output.property}-${index}`} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground truncate">{output.title || String(output.propertyKey)}:</span>
                        <code className="font-mono text-foreground text-[10px] bg-muted px-1 rounded">
                            {output.condition}
                        </code>
                    </div>
                ))
            ) : (
                <div className="text-muted-foreground italic">未配置路由</div>
            )}
        </div>
    )
}

@Injectable()
export class SwitchAstRender {
    @Render(SwitchAst)
    render(ast: SwitchAst, ctx: any) {
        return <SwitchComponent ast={ast} />
    }
}
