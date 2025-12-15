import { Injectable } from "@sker/core";
import { Handler, NodeEvent, ROUTE_SKIPPED, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { useLlmModel } from "./llm-client";

@Injectable()
export class LlmCategoryAstVisitor {

    @Handler(LlmCategoryAst)
    visit(ast: LlmCategoryAst, input$: Observable<any>, ctx: WorkflowGraphAst) {
        return new Observable<NodeEvent>((obs) => {
            const abortController = new AbortController();

            ast.state = 'running';
            ast.count += 1;
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            input$.subscribe({
                next: async () => {
                    try {
                        ast.emitCount += 1;
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
                            obs.next({ type: 'node_emit', id: ast.id, property: 'output_default', value: ast.context });
                            return;
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

输入："制作一个产品宣传视频"
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

                        obs.next({ type: 'node_emit', id: ast.id, property: 'rawOutput', value: result });

                        const matched = categories.find(c => {
                            const title = c.title.trim().toLowerCase();
                            const answer = result.toLowerCase();
                            return answer === title || answer.includes(title) || title.includes(answer);
                        });

                        const finalMatched = matched || categories.find(c => c.isDefault);

                        for (const cat of categories) {
                            const value = cat === finalMatched ? ast.context : ROUTE_SKIPPED;
                            obs.next({ type: 'node_emit', id: ast.id, property: cat.property, value });
                        }
                    } catch (error) {
                        console.error('[LlmCategoryAst] 执行失败:', error);
                        ast.state = 'fail';
                        setAstError(ast, error);
                        obs.next({ type: 'node_fail', id: ast.id, data: ast });
                        obs.complete();
                    }
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, data: ast });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id, data: ast });
                    obs.complete();
                }
            });

            return () => {
                abortController.abort();
                obs.complete();
            };
        });
    }
}
