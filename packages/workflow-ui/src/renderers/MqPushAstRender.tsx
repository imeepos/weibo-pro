import { Injectable } from "@sker/core";
import { MqPushAst, Render } from "@sker/workflow";
import React from "react";

@Injectable()
export class MqPushAstRender {
    @Render(MqPushAst)
    render(ast: MqPushAst) {
        return (
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-2">
                {ast.queueName && (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">队列:</span>
                        <code className="px-2 py-1 bg-muted rounded text-xs">{ast.queueName}</code>
                    </div>
                )}
                {ast.success && (
                    <div className="text-green-600 dark:text-green-400 text-sm">
                        ✓ 推送成功
                    </div>
                )}
            </div>
        );
    }
}
