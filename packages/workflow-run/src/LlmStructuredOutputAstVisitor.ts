import { Injectable } from "@sker/core";
import { Handler, INodeOutputMetadata, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { ChatOpenAI } from "@langchain/openai";

const buildSchemaFromMetadata = (outputs: INodeOutputMetadata[]) => {
    const properties: Record<string, { type: string; description?: string }> = {};
    const required: string[] = [];

    for (const output of outputs) {
        const desc = output.description || output.title || '';
        properties[output.property] = {
            type: output.type || 'string',
            description: desc ? `${desc}（字段名必须是 ${output.property}）` : `字段名必须是 ${output.property}`
        };
        required.push(output.property);
    }

    return { type: 'object', properties, required };
};

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

                const schema = buildSchemaFromMetadata(ast.metadata?.outputs || []);
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

                const outputs = ast.metadata?.outputs || [];
                const resultObj = result as Record<string, unknown>;

                // 按定义的输出属性名提取值，优先精确匹配，否则按顺序映射
                const resultKeys = Object.keys(resultObj);
                outputs.forEach((output, index) => {
                    if (output.property in resultObj) {
                        // 精确匹配
                        (ast as any)[output.property] = resultObj[output.property];
                    } else if (resultKeys[index] !== undefined) {
                        // 按顺序映射
                        (ast as any)[output.property] = resultObj[resultKeys[index]!];
                    }
                });

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
