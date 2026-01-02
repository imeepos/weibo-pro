import { Injectable } from "@sker/core";
import { Handler, INodeOutputMetadata, NodeEvent, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from "./llm-client";

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
    visit(ast: LlmStructuredOutputAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
        return new Observable<NodeEvent>((obs) => {
            const abortController = new AbortController();

            ast.state = 'running';
            ast.count += 1;
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消');
                    }

                    const outputs = ast.metadata?.outputs || [];
                    const jsonPrompt = buildJsonPrompt(outputs);
                    const model = useLlmModel({ model: ast.model, temperature: ast.temperature });

                    const systemContent = ast.system.length ? ast.system.join('\n') + '\n\n' + jsonPrompt : jsonPrompt;
                    const messages = [
                        { role: 'system' as const, content: systemContent },
                        { role: 'user' as const, content: Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt }
                    ];

                    const response = await model.invoke(messages);
                    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

                    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
                    const parseResult = parseWithHarmony(jsonMatch[1]!.trim());

                    if (typeof parseResult.data !== 'object' || parseResult.data === null) {
                        throw new Error('LLM 返回的 JSON 格式无效，无法解析为结构化数据');
                    }

                    const result = parseResult.data as Record<string, unknown>;

                    const data: Record<string, unknown> = {};
                    for (const output of outputs) {
                        if (output.property in result) {
                            (ast as unknown as Record<string, unknown>)[output.property] = result[output.property];
                            data[output.property] = result[output.property];
                        }
                    }

                    return [{ type: 'node_emit' as const, id: ast.id, data }];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => {
                    obs.next(event);
                },
                error: (error) => {
                    console.error('[LlmStructuredOutputAst] 执行失败:', error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => {
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }
}
