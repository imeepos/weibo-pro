import { Injectable } from "@sker/core";
import { useOpenAi } from "@sker/nlp";
import { Handler } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

@Injectable()
export class LlmTextAgentAstVisitor {

    @Handler(LlmTextAgentAst)
    handler(ast: LlmTextAgentAst, ctx: any) {
        return new Observable((obs) => {
            const run = async () => {
                const client = useOpenAi()
                const response = await client.chat.completions.create({
                    model: 'deepseek-ai/DeepSeek-V3.2-Exp',
                    messages: [
                        { role: 'system', content: ast.system },
                        { role: 'user', content: ast.prompt }
                    ],
                    temperature: 0.2,
                    response_format: { type: 'json_object' },
                });
                ast.text = response.choices[0]?.message.content || ``;
                ast.state = 'emitting'
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