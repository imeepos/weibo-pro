import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { CodeGeneratorAst } from '@sker/workflow-ast'
import React from 'react'

const CodeGeneratorComponent: React.FC<{ ast: CodeGeneratorAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">操作:</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    ast.operation === 'create' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                    ast.operation === 'modify' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                    'bg-red-500/20 text-red-700 dark:text-red-400'
                }`}>
                    {ast.operation === 'create' ? '新建' : ast.operation === 'modify' ? '修改' : '删除'}
                </span>
            </div>
            {ast.techStack && (
                <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">技术栈:</span>
                    <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px]">
                        {ast.techStack}
                    </code>
                </div>
            )}
            {ast.filePath && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">文件路径:</span>
                    <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded block break-all">
                        {ast.filePath}
                    </code>
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">任务进度:</span>
                <span className="text-foreground text-[10px]">{ast.currentTaskIndex + 1} / {ast.tasks.length}</span>
            </div>
            {ast.isComplete && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-green-600 dark:text-green-400 text-[10px]">✓ 已完成</span>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class CodeGeneratorAstRender {
    @Render(CodeGeneratorAst)
    render(ast: CodeGeneratorAst, _ctx: any) {
        return <CodeGeneratorComponent ast={ast} />
    }
}
