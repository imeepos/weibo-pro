import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

export interface SearchSnippet {
    title: string;
    url: string;
    description: string;
}

export interface SerpCluster {
    insight: string;
    question: string;
    urls: string[];
}

@Node({
    title: 'SERP聚类器',
    type: 'analysis',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 2
})
export class SerpClusterAst extends Ast {

    @Input({ title: '搜索结果', mode: IS_MULTI })
    searchResults: SearchSnippet[] = [];

    @Input({ title: '最大集群数' })
    maxClusters: number = 5;

    @Output({ title: '聚类结果' })
    clusters: SerpCluster[] = [];

    type: 'SerpClusterAst' = 'SerpClusterAst';
}
