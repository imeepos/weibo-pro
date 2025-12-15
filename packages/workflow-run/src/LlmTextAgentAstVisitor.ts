import { Injectable } from "@sker/core";
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { useLlmModel } from "./llm-client";
@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    visit(ast: LlmTextAgentAst, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>((obs) => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            input$.subscribe({
                next: async () => {
                    try {
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

                        obs.next({ type: 'node_emit', id: ast.id, property: 'text', value: result.content });
                        obs.next({ type: 'node_emit', id: ast.id, property: 'username', value: ast.name });
                        obs.next({ type: 'node_emit', id: ast.id, property: 'description', value: ast.description });
                    } catch (error) {
                        ast.state = 'fail';
                        setAstError(ast, error);
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
                console.log('[LlmTextAgentAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            };
        });
    }
}