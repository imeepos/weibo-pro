import { Injectable } from "@sker/core";
import { Render, StoreSetAst } from "@sker/workflow";
import React from "react";

@Injectable()
export class StoreSetAstRender {
    @Render(StoreSetAst)
    render(ast: StoreSetAst) {
        return (
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-2">
                {ast.key && (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">键:</span>
                        <code className="px-2 py-1 bg-muted rounded text-xs">{ast.key}</code>
                    </div>
                )}
                {ast.value !== undefined && ast.value !== '' && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">值:</div>
                        <pre className="text-xs overflow-auto max-h-40">
                            {typeof ast.value === 'string'
                                ? ast.value
                                : JSON.stringify(ast.value, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    }
}
