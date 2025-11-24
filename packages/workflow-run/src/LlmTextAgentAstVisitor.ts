import { Injectable, root } from "@sker/core";
import { DataFlowManager, Handler, INode } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { tool } from "langchain";
import { z } from 'zod'
import { createDeepAgent } from "deepagents";

export const getNodeTool = (nodes: INode[]) => {
    return tool(
        async ({ name }) => {
            const filterNodes = nodes.filter(node => node.name === name)
            const dataFlowManager = root.get(DataFlowManager)
            return filterNodes.map(it => {
                return { name: it.name, description: it.description, content: dataFlowManager.extractNodeOutputs(it) }
            })
        },
        {
            name: 'getNode', description: `get node content`, schema: z.object({
                name: z.string()
            })
        }
    )
}
@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    handler(ast: LlmTextAgentAst, ctx: any) {
        return new Observable((obs) => {
            const run = async () => {
                if (!ast.prompt) {
                    ast.state = 'fail';
                    obs.next({ ...ast })
                    obs.complete()
                    return;
                }
                const agent = createDeepAgent({
                    name: ast.name,
                    systemPrompt: ast.system,
                    model: ast.model,
                    tools: [getNodeTool(ast.nodes)]
                })
                const result = await agent.invoke(ast.prompt)
                ast.text = result.messages[result.messages.length - 1].content;
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