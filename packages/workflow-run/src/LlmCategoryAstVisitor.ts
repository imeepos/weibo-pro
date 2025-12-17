import { Injectable } from "@sker/core";
import { Handler, NodeEvent, ROUTE_SKIPPED, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { useLlmModel } from "./llm-client";

@Injectable()
export class LlmCategoryAstVisitor {

    @Handler(LlmCategoryAst)
    visit(ast: LlmCategoryAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
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

                    const outputs = ast.metadata.outputs.filter(o => o.isRouter);
                    const categories = outputs.map(o => ({
                        property: o.property,
                        title: o.title || o.property,
                        description: o.description || '',
                        isDefault: o.property === 'output_default'
                    }));

                    const nonDefaultCategories = categories.filter(c => !c.isDefault);
                    if (nonDefaultCategories.length === 0) {
                        return [
                            { type: 'node_emit' as const, id: ast.id, data: { output_default: ast.context } }
                        ];
                    }

                    const categoryList = categories
                        .map((c, i) => `${i + 1}. ${c.title}${c.description ? ` - ${c.description}` : ''}`)
                        .join('\n');

                    const titleList = categories.map(c => c.title).join(' / ');

                    const prompt = `请从以下类别中选择最匹配的一项（必须选择一个）：
${categoryList}

【重要约束】
- 你只能输出以下类别名称之一：${titleList}
- 禁止输出任何其他内容，包括序号、标点、解释
- 直接输出类别名称，一个词即可

【示例】
输入："帮我生成一张猫咪的图片"
输出：图片

输入:"制作一个产品宣传视频"
输出：视频

输入："今天天气怎么样"
输出：Default`;

                    const model = useLlmModel({ model: ast.model, temperature: ast.temperature });
                    const userContent = ast.context.join('\n\n---\n\n');

                    const messages = [
                        { role: 'system' as const, content: `${ast.system}\n\n${prompt}` },
                        { role: 'user' as const, content: userContent }
                    ];

                    const response = await model.invoke(messages);
                    const result = (typeof response.content === 'string' ? response.content : '').trim();

                    const matched = categories.find(c => {
                        const title = c.title.trim().toLowerCase();
                        const answer = result.toLowerCase();
                        return answer === title || answer.includes(title) || title.includes(answer);
                    });

                    const finalMatched = matched || categories.find(c => c.isDefault);

                    // 只发射匹配的分支，不发射 ROUTE_SKIPPED
                    const events: NodeEvent[] = [
                        { type: 'node_emit' as const, id: ast.id, data: { rawOutput: result } }
                    ];

                    if (finalMatched) {
                        events.push({
                            type: 'node_emit' as const,
                            id: ast.id,
                            data: { [finalMatched.property]: ast.context }
                        });
                    }

                    return events;
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => {
                    obs.next(event);
                },
                error: (error) => {
                    console.error('[LlmCategoryAst] 执行失败:', error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
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
