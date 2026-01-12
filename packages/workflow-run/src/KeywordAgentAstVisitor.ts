import { Injectable } from "@sker/core";
import { Handler, NodeEvent, WorkflowGraphAst } from "@sker/workflow";
import { KeywordAgentAst, type SearchStrategy } from "@sker/workflow-ast";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from "./llm-client";
import { ErrorHandlerOperators } from "./utils/error-handler.util";

@Injectable()
export class KeywordAgentAstVisitor {

    @Handler(KeywordAgentAst)
    visit(ast: KeywordAgentAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>((obs) => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData): Promise<NodeEvent[]> => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消');
                    }

                    // 构建用户提示词（要求 JSON 输出）
                    const userPrompt = this.buildUserPrompt(ast);

                    // 调用 LLM
                    const llmModel = useLlmModel({ model: ast.model, temperature: ast.temperature });

                    const result = await llmModel.invoke([
                        { role: 'system', content: ast.systemPrompt },
                        { role: 'human', content: userPrompt }
                    ]);

                    // 解析结果为结构化数据
                    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
                    const parsed = this.parseAnalysisResult(content);

                    // 更新 AST 实例
                    ast.analysisResult = content;
                    ast.coreKeywords = parsed.coreKeywords;
                    ast.extendedKeywords = parsed.extendedKeywords;
                    ast.hotWords = parsed.hotWords;
                    ast.searchStrategy = parsed.searchStrategy;

                    return [
                        {
                            type: 'node_emit' as const,
                            id: ast.id,
                            data: {
                                analysisResult: ast.analysisResult,
                                coreKeywords: ast.coreKeywords,
                                extendedKeywords: ast.extendedKeywords,
                                hotWords: ast.hotWords,
                                searchStrategy: ast.searchStrategy
                            }
                        }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[KeywordAgentAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[KeywordAgentAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events)),
            ).subscribe({
                next: (event: NodeEvent) => {
                    obs.next(event);
                },
                error: (error) => {
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => {
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }

    private buildUserPrompt(ast: KeywordAgentAst): string {
        const speeches = (ast.speechesText || []).join('\n\n');
        return `分析主题：${ast.topic}

${speeches ? `参考其他Agent的发言：\n${speeches}\n\n` : ''}请分析该需求并提取关键词，按以下 JSON 格式输出：

\`\`\`json
{
  "coreKeywords": ["关键词1", "关键词2"],
  "extendedKeywords": ["扩展词1", "扩展词2", "扩展词3"],
  "hotWords": ["网络热词1", "网络热词2"],
  "searchStrategy": {
    "queryAgent": "Query Agent的搜索建议",
    "mediaAgent": "Media Agent的搜索建议",
    "insightAgent": "Insight Agent的搜索建议",
    "dimensions": {
      "timeRange": "建议的时间范围",
      "platforms": ["平台1", "平台2"],
      "targetAudience": "目标人群描述"
    }
  }
}
\`\`\``;
    }

    private parseAnalysisResult(text: string): ParsedResult {
        // 提取 JSON 内容（支持 ```json 代码块）
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
        const parseResult = parseWithHarmony(jsonMatch[1]!.trim());

        if (typeof parseResult.data !== 'object' || parseResult.data === null) {
            throw new Error('LLM 返回的 JSON 格式无效，无法解析为结构化数据');
        }

        const data = parseResult.data as Record<string, unknown>;

        // 提取并验证字段
        const coreKeywords = this.parseStringArray(data.coreKeywords);
        const extendedKeywords = this.parseStringArray(data.extendedKeywords);
        const hotWords = this.parseStringArray(data.hotWords);
        const searchStrategy = this.parseSearchStrategy(data.searchStrategy);

        return { coreKeywords, extendedKeywords, hotWords, searchStrategy };
    }

    private parseStringArray(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value.map(v => String(v)).filter(Boolean);
        }
        if (typeof value === 'string') {
            return [value];
        }
        return [];
    }

    private parseSearchStrategy(value: unknown): SearchStrategy {
        if (typeof value !== 'object' || value === null) {
            return this.getDefaultSearchStrategy();
        }

        const data = value as Record<string, unknown>;
        const dimensions = data.dimensions as Record<string, unknown> | undefined;

        return {
            queryAgent: String(data.queryAgent || ''),
            mediaAgent: String(data.mediaAgent || ''),
            insightAgent: String(data.insightAgent || ''),
            dimensions: {
                timeRange: String(dimensions?.timeRange || ''),
                platforms: this.parseStringArray(dimensions?.platforms),
                targetAudience: String(dimensions?.targetAudience || '')
            }
        };
    }

    private getDefaultSearchStrategy(): SearchStrategy {
        return {
            queryAgent: '',
            mediaAgent: '',
            insightAgent: '',
            dimensions: {
                timeRange: '',
                platforms: [],
                targetAudience: ''
            }
        };
    }
}

interface ParsedResult {
    coreKeywords: string[];
    extendedKeywords: string[];
    hotWords: string[];
    searchStrategy: SearchStrategy;
}
