import { Injectable } from "@sker/core";
import { MqPullAst, Render } from "@sker/workflow";
import React from "react";

@Injectable()
export class MqPullAstRender {
    @Render(MqPullAst)
    render(ast: MqPullAst) {
        return (
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-2">
                {ast.queueName && (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">队列:</span>
                        <code className="px-2 py-1 bg-muted rounded text-xs">{ast.queueName}</code>
                    </div>
                )}
                {ast.output && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                        <pre className="text-xs overflow-auto max-h-40">
                            {typeof ast.output === 'string'
                                ? ast.output
                                : JSON.stringify(ast.output, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    }
}
