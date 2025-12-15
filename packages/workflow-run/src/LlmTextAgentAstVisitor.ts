import { Injectable } from "@sker/core";
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { useLlmModel } from "./llm-client";
@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    visit(ast: LlmTextAgentAst, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>((obs) => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
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
                        { type: 'node_emit' as const, id: ast.id, property: 'text', value: result.content },
                        { type: 'node_emit' as const, id: ast.id, property: 'username', value: ast.username },
                        { type: 'node_emit' as const, id: ast.id, property: 'profile', value: ast.profile }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => {
                    obs.next(event);
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
                console.log('[LlmTextAgentAstVisitor] 订阅被取消，触发 AbortSignal');
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }
}