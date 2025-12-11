import { Injectable } from "@sker/core";
import { Handler, INodeOutputMetadata, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { ChatOpenAI } from "@langchain/openai";

const buildJsonPrompt = (outputs: INodeOutputMetadata[]) => {
    const fields = outputs.map(o => {
        const desc = o.description || o.title || '';
        return `  "${o.property}": ${desc ? `// ${desc}` : ''}`;
    }).join('\n');
    return `请严格按以下 JSON 格式输出，不要输出其他内容：\n{\n${fields}\n}`;
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

                const outputs = ast.metadata?.outputs || [];
                const jsonPrompt = buildJsonPrompt(outputs);
                const model = new ChatOpenAI({ model: ast.model, temperature: ast.temperature });

                const systemContent = ast.system.length ? ast.system.join('\n') + '\n\n' + jsonPrompt : jsonPrompt;
                const messages = [
                    { role: 'system' as const, content: systemContent },
                    { role: 'user' as const, content: Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt }
                ];

                const response = await model.invoke(messages);
                const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

                // 提取 JSON（支持 markdown 代码块）
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
                const result = JSON.parse(jsonMatch[1]!.trim()) as Record<string, unknown>;

                if (abortController.signal.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                // 将结果赋值到输出属性
                for (const output of outputs) {
                    if (output.property in result) {
                        (ast as any)[output.property] = result[output.property];
                    }
                }
                obs.next({ ...ast });

                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
            };

            run().catch(e => {
                console.error('[LlmStructuredOutputAst] 执行失败:', e);
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
