import { Injectable } from "@sker/core";
import { Handler, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { ChatOpenAI } from "@langchain/openai";

@Injectable()
export class LlmStructuredOutputAstVisitor {

    @Handler(LlmStructuredOutputAst)
    handler(ast: LlmStructuredOutputAst, ctx: WorkflowGraphAst) {
        return new Observable((obs) => {
            const abortController = new AbortController();

            const run = async () => {
                if (abortController.signal.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                ast.state = 'running';
                ast.count += 1;
                obs.next({ ...ast });

                const schema = JSON.parse(ast.schema);
                const model = new ChatOpenAI({ model: ast.model, temperature: ast.temperature });
                const structuredModel = model.withStructuredOutput(schema);

                const messages = [
                    ...(ast.system.length ? [{ role: 'system' as const, content: ast.system.join('\n') }] : []),
                    { role: 'user' as const, content: Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt }
                ];

                const result = await structuredModel.invoke(messages);

                if (abortController.signal.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                ast.output = result as Record<string, unknown>;
                ast.rawText = JSON.stringify(result, null, 2);
                ast.state = 'emitting';
                obs.next({ ...ast });

                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
            };

            run().catch(e => {
                ast.state = 'fail';
                ast.error = e;
                obs.next({ ...ast });
                obs.complete();
            });

            return () => {
                abortController.abort();
                obs.complete();
            };
        });
    }
}
