import { Injectable, root } from "@sker/core";
import { DataFlowManager, Handler, INode, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { z } from 'zod'
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
export const getNodeTool = (nodes: INode[]) => {
    const tool = new DynamicStructuredTool({
        name: 'getNode',
        description: 'get node content',
        schema: z.object({ name: z.string() }),
        func: async ({ name }) => {
            const filterNodes = nodes.filter(node => node.name === name)
            const dataFlowManager = root.get(DataFlowManager)
            return filterNodes.map(it => {
                return { name: it.name, description: it.description, content: dataFlowManager.extractNodeOutputs(it) }
            })
        }
    })
    return tool
}
@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    handler(ast: LlmTextAgentAst, ctx: WorkflowGraphAst) {
        return new Observable((obs) => {
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
                    obs.next({ ...ast });
                    return;
                }

                ast.state = 'running';
                ast.count += 1;
                obs.next({ ...ast })

                const chartModel = new ChatOpenAI({ model: ast.model, temperature: ast.temperature });

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
                    obs.next({ ...ast });
                    return;
                }

                ast.text.next(result.content as string);
                ast.username.next(ast.name || ast.id);
                ast.profile.next(ast.description || ast.name || ast.id);
                obs.next({ ...ast })

                ast.state = 'success';
                obs.next({ ...ast })
                obs.complete()
            }
            run().catch(e => {
                ast.state = 'fail'
                ast.error = e;
                obs.next({ ...ast })
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