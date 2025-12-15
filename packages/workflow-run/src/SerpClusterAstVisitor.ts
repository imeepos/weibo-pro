import { Injectable } from "@sker/core";
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { SerpClusterAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { useLlmModel } from "./llm-client";

const SYSTEM_PROMPT = `你是搜索结果分析器，负责将搜索引擎返回的结果分组为有意义的集群。

每个集群应包含：
1. insight - 内容摘要、关键数据和洞察，以可操作的建议结尾（如"访问这些URL了解..."）
2. question - 该集群回答的具体问题
3. urls - 相关的URL列表

要求：
- 集群之间应正交（互不重叠）
- 不使用"该集群..."等笼统表述
- 问题应具体，避免"哪里可以找到..."等泛化问题

严格按以下JSON格式输出：
{
  "clusters": [
    {
      "insight": "摘要和关键数据...",
      "question": "具体问题?",
      "urls": ["url1", "url2"]
    }
  ]
}`;

@Injectable()
export class SerpClusterAstVisitor {

    @Handler(SerpClusterAst)
    handler(ast: SerpClusterAst, input$: Observable<any>, ctx: WorkflowGraphAst) {
        return new Observable<NodeEvent>((obs) => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            input$.subscribe({
                next: async (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }

                    try {
                        if (abortController.signal.aborted) {
                            ast.state = 'fail';
                            setAstError(ast, new Error('工作流已取消'));
                            obs.next({ type: 'node_fail', id: ast.id, data: ast });
                            return;
                        }

                        const model = useLlmModel({ temperature: 0 });
                        const userContent = JSON.stringify(ast.searchResults, null, 2);

                        const messages = [
                            { role: 'system' as const, content: SYSTEM_PROMPT + `\n最多生成 ${ast.maxClusters} 个集群。` },
                            { role: 'user' as const, content: userContent }
                        ];

                        const response = await model.invoke(messages);
                        const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

                        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
                        const result = JSON.parse(jsonMatch[1]!.trim());

                        if (abortController.signal.aborted) {
                            ast.state = 'fail';
                            setAstError(ast, new Error('工作流已取消'));
                            obs.next({ type: 'node_fail', id: ast.id, data: ast });
                            return;
                        }

                        ast.clusters = result.clusters || [];

                        obs.next({ type: 'node_emit', id: ast.id, property: 'clusters', value: ast.clusters });

                    } catch (error) {
                        console.error('[SerpClusterAst] 执行失败:', error);
                        ast.state = 'fail';
                        setAstError(ast, error instanceof Error ? error : new Error(String(error)));
                        obs.next({ type: 'node_fail', id: ast.id, data: ast });
                        obs.complete();
                    }
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, data: ast });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id, data: ast });
                    obs.complete();
                }
            });

            return () => {
                abortController.abort();
                obs.complete();
            };
        });
    }
}
