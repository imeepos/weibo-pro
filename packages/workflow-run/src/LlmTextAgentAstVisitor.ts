import { Injectable, root } from "@sker/core";
import { DataFlowManager, Handler, INode, WorkflowGraphAst } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { z } from 'zod'
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
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
            const run = async () => {
                ast.state = 'running';
                ast.count += 1;
                obs.next({ ...ast })

                if (!ast.prompt) {
                    ast.state = 'fail';
                    obs.next({ ...ast })
                    obs.complete()
                    return;
                }
                const chartModel = new ChatOpenAI({ model: ast.model, temperature: ast.temperature });
                const result = await chartModel.invoke(ast.prompt)
                // 获取nodes
                ast.text = result.content as string;
                ast.state = 'emitting'
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
            return () => obs.complete()
        })
    }
}