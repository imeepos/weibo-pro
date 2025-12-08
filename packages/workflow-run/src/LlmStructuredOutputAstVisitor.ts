import { Injectable } from "@sker/core";
import { Handler, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { ChatOpenAI } from "@langchain/openai";

interface JsonSchema {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
}

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

                const schema: JsonSchema = JSON.parse(ast.schema);

                // 根据 schema 动态生成 metadata.outputs
                if (schema.properties) {
                    ast.metadata = ast.metadata || { class: {}, inputs: [], outputs: [], states: [] };
                    ast.metadata.outputs = Object.entries(schema.properties).map(([key, prop]) => ({
                        property: key,
                        title: prop.description || key,
                        type: prop.type
                    }));
                }

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

                // 将结构化输出的每个字段赋值到 ast 上
                for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
                    (ast as any)[key] = value;
                }

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
