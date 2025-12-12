import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { SerpClusterAst } from "@sker/workflow-ast";
import React from "react";

@Injectable()
export class SerpClusterAstRender {
    @Render(SerpClusterAst)
    render(ast: SerpClusterAst) {
        if (!ast.clusters?.length) return null;

        return (
            <div className="space-y-4 p-4">
                <div className="text-sm font-medium text-muted-foreground">
                    共 {ast.clusters.length} 个聚类
                </div>
                {ast.clusters.map((cluster, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                        <div className="font-semibold text-primary">
                            {cluster.question}
                        </div>
                        <div className="text-sm text-foreground/80">
                            {cluster.insight}
                        </div>
                        {cluster.urls?.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">
                                    相关链接 ({cluster.urls.length})
                                </div>
                                <div className="space-y-1">
                                    {cluster.urls.map((url, urlIdx) => (
                                        <a
                                            key={urlIdx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-xs text-blue-600 hover:underline truncate"
                                            title={url}
                                        >
                                            {url}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
}
