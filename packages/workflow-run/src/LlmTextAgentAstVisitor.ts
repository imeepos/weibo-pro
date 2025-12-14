import { Injectable } from "@sker/core";
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { useLlmModel } from "./llm-client";
@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    handler(ast: LlmTextAgentAst, ctx: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>((obs) => {
            // 创建专门的 AbortController
            const abortController = new AbortController();

            // 包装 ctx
            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal
            };

            const run = async () => {
                // 检查取消信号
                if (wrappedCtx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ type: 'node_fail', id: ast.id, data: ast })
                    return;
                }

                ast.state = 'running';
                obs.next({ type: 'node_runing', id: ast.id, data: ast })

                const chartModel = useLlmModel({ model: ast.model, temperature: ast.temperature });

                // LLM 调用（未来可传递 signal）
                const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt
                const systems = Array.isArray(ast.system) ? ast.system.join('\n') : ast.system

                const result = await chartModel.invoke([
                    { role: 'system', content: systems },
                    { role: 'human', content: prompts }
                ])

                // 检查取消信号（LLM 调用后）
                if (wrappedCtx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ type: 'node_fail', id: ast.id, data: ast })
                    return;
                }

                obs.next({ type: 'node_emit', id: ast.id, property: 'text', value: result.content })
                obs.next({ type: 'node_emit', id: ast.id, property: 'username', value: ast.name })
                obs.next({ type: 'node_emit', id: ast.id, property: 'description', value: ast.description })

                ast.state = 'success';
                obs.next({ type: 'node_success', id: ast.id, data: ast })
                obs.complete()
            }
            run().catch(e => {
                ast.state = 'fail'
                setAstError(ast, e);
                obs.next({ type: 'node_fail', id: ast.id, data: ast })
                obs.complete()
            })

            // 返回清理函数
            return () => {
                console.log('[LlmTextAgentAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            }
        })
    }
}