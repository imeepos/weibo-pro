import { Injectable } from "@sker/core";
import { Handler, ROUTE_SKIPPED, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { BehaviorSubject, Observable } from "rxjs";
import { useLlmModel } from "./llm-client";

@Injectable()
export class LlmCategoryAstVisitor {

    @Handler(LlmCategoryAst)
    handler(ast: LlmCategoryAst, ctx: WorkflowGraphAst) {
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

                const outputs = ast.metadata.outputs.filter(o => o.isRouter);
                const categories = outputs.map(o => ({
                    property: o.property,
                    title: o.title || o.property,
                    description: o.description || '',
                    isDefault: o.property === 'output_default'
                }));

                // 只有 default 一个分类时，直接走 default
                const nonDefaultCategories = categories.filter(c => !c.isDefault);
                if (nonDefaultCategories.length === 0) {
                    this.setOutput(ast, 'output_default', ast.context);
                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete();
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

                // 输出原始结果用于调试
                this.setOutput(ast, 'rawOutput', result);

                if (abortController.signal.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                // 模糊匹配：忽略大小写、空格，支持包含匹配
                const matched = categories.find(c => {
                    const title = c.title.trim().toLowerCase();
                    const answer = result.toLowerCase();
                    return answer === title || answer.includes(title) || title.includes(answer);
                });

                // 如果没有匹配到任何分类，走 default
                const finalMatched = matched || categories.find(c => c.isDefault);

                for (const cat of categories) {
                    const value = cat === finalMatched ? ast.context : ROUTE_SKIPPED;
                    this.setOutput(ast, cat.property, value);
                }

                obs.next({ ...ast });
                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
            };

            run().catch(e => {
                console.error('[LlmCategoryAst] 执行失败:', e);
                ast.state = 'fail';
                setAstError(ast, e);
                obs.next({ ...ast });
                obs.complete();
            });

            return () => {
                abortController.abort();
                obs.complete();
            };
        });
    }

    private setOutput(ast: LlmCategoryAst, property: string, value: any): void {
        const target = (ast as any)[property];
        if (target instanceof BehaviorSubject) {
            target.next(value);
        } else {
            (ast as any)[property] = value;
        }
    }
}
