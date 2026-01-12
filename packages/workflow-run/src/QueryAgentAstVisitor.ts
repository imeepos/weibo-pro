import { Injectable } from "@sker/core";
import { Handler, NodeEvent, WorkflowGraphAst } from "@sker/workflow";
import { QueryAgentAst } from "@sker/workflow-ast";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { useLlmModel } from "./llm-client";
import { ErrorHandlerOperators } from "./utils/error-handler.util";

@Injectable()
export class QueryAgentAstVisitor {

    @Handler(QueryAgentAst)
    visit(ast: QueryAgentAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
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

                    const llmModel = useLlmModel({ model: 'deepseek-ai/DeepSeek-V3.2', temperature: ast.temperature });

                    const result = await llmModel.invoke([
                        { role: 'system', content: ast.systemPrompt },
                        { role: 'human', content: ast.userPrompt }
                    ]);

                    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
                    ast.analysisResult = content;

                    return [
                        {
                            type: 'node_emit' as const,
                            id: ast.id,
                            data: {
                                analysisResult: ast.analysisResult
                            }
                        }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[QueryAgentAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[QueryAgentAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events)),
            ).subscribe({
                next: (event: NodeEvent) => {
                    obs.next(event);
                },
                error: () => {
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
}
