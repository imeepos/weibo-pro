import { Injectable } from "@sker/core";
import { Handler, NodeEvent, WorkflowGraphAst } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { useLlmModel } from "./llm-client";
import { ErrorHandlerOperators } from "./utils/error-handler.util";
@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    visit(ast: LlmTextAgentAst, input$: Observable<Record<string, unknown>>, _ctx: WorkflowGraphAst): Observable<NodeEvent> {
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

                    const chartModel = useLlmModel({ model: ast.model, temperature: ast.temperature });

                    const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt;
                    const systems = Array.isArray(ast.system) ? ast.system.join('\n') : ast.system;

                    const result = await chartModel.invoke([
                        { role: 'system', content: systems },
                        { role: 'human', content: prompts }
                    ]);

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { text: result.content, username: ast.username, profile: ast.profile } }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmTextAgentAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmTextAgentAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events)),
            ).subscribe({
                next: (event: NodeEvent) => {
                    obs.next(event);
                },
                error: (_error) => {
                    // 错误已在 catchError 中处理，这里只需要发送失败事件
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