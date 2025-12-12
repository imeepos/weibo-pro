import { Injectable } from "@sker/core";
import { Handler, ROUTE_SKIPPED, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { BehaviorSubject, Observable } from "rxjs";
import { ChatOpenAI } from "@langchain/openai";

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
                const categories = outputs
                    .filter(o => o.property !== 'output_default')
                    .map(o => ({
                        property: o.property,
                        title: o.title || o.property,
                        description: o.description || ''
                    }));

                if (categories.length === 0) {
                    this.setOutput(ast, 'output_default', ast.context);
                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete();
                    return;
                }

                const categoryList = categories
                    .map((c, i) => `${i + 1}. ${c.title}${c.description ? ` - ${c.description}` : ''}`)
                    .join('\n');

                const prompt = `请从以下类别中选择最匹配的一项：
${categoryList}

只需回复类别名称，不要包含序号或其他内容。`;

                const model = new ChatOpenAI({ model: ast.model, temperature: ast.temperature });
                const userContent = ast.context.join('\n\n---\n\n');

                const messages = [
                    { role: 'system' as const, content: `${ast.system}\n\n${prompt}` },
                    { role: 'user' as const, content: userContent }
                ];

                const response = await model.invoke(messages);
                const result = (typeof response.content === 'string' ? response.content : '').trim();

                if (abortController.signal.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                const matched = categories.find(c => c.title === result);

                for (const cat of categories) {
                    const value = cat === matched ? ast.context : ROUTE_SKIPPED;
                    this.setOutput(ast, cat.property, value);
                }

                const defaultValue = matched ? ROUTE_SKIPPED : ast.context;
                this.setOutput(ast, 'output_default', defaultValue);

                obs.next({ ...ast });
                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
            };

            run().catch(e => {
                console.error('[LlmCategoryAst] 执行失败:', e);
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

    private setOutput(ast: LlmCategoryAst, property: string, value: any): void {
        const target = (ast as any)[property];
        if (target instanceof BehaviorSubject) {
            target.next(value);
        } else {
            (ast as any)[property] = value;
        }
    }
}
