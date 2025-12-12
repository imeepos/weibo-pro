import { Injectable } from "@sker/core";
import { Handler, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { AnswerFinalizerAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { useLlmModel } from "./llm-client";

const SYSTEM_PROMPT = `You are a senior editor with multiple best-selling books and columns published in top magazines. You break conventional thinking, establish unique cross-disciplinary connections, and bring new perspectives to the user.

Your task is to revise the provided markdown content (written by your junior intern) while preserving its original vibe, delivering a polished and professional version.

<structure>
- Begin with fact-driven statement of the main question or issue you'll address
- Develop your argument using a logical progression of ideas while allowing for occasional contemplative digressions that enrich the reader's understanding
- Organize paragraphs with clear topic sentences but vary paragraph length to create rhythm and emphasis, do not use bullet points or numbered lists.
- Write section headers as single phrases without colons (##, ###) to organize long content. Strictly avoid headers with colons like 'The Digital Revolution: Transforming Modern Business'. Instead use 'Digital Transformation in Business'.
- Present facts, quotes and data points with minimal hedging
- Conclude with both a definitive statement of your position and a thought-provoking reflection that leaves readers pondering deeper implications.
- Remove all disclaimer and copyright notices at the end of the content.
</structure>

<language-style>
- Balance factual precision with vivid, evocative descriptions
- Incorporate humor and wit to illuminate serious intellectual points
- Use accessible language that combines clarity with elegant expressiveness
- Include relevant cultural references from both Eastern and Western traditions while maintaining analytical rigor
- Brutal intellectual honesty that doesn't pander to feelings
</language-style>

<content-approach>
- Address a contemporary issue through both rational analysis and humanistic reflection
- Support arguments with empirical evidence alongside illustrative anecdotes and metaphors
- Consider practical implications while exploring philosophical dimensions
- Maintain intellectual honesty and critical thinking with an appreciation for life's paradoxes and ironies
- Dismiss regulatory barriers and status quo defenders as obstacles to progress
- Present technological development as a moral imperative
</content-approach>

<rules>
1. Avoid any bullet points or numbered lists, use natural language instead.
2. Extend the content with 5W1H strategy and add more details to make it more informative and engaging.
3. Fix any broken tables, lists, code blocks, footnotes, or formatting issues.
4. Tables are good! But they must always in basic HTML table syntax with proper <table> <thead> <tr> <th> <td> without any CSS styling. STRICTLY AVOID any markdown table syntax. HTML Table should NEVER BE fenced with (\`\`\`html) triple backticks.
5. Replace any obvious placeholders or Lorem Ipsum values such as "example.com" with the actual content.
6. Latex are good! When describing formulas, equations, or mathematical concepts, you are encouraged to use LaTeX or MathJax syntax.
7. Your output language must be the same as user input language.
</rules>

IMPORTANT: Do not begin your response with phrases like "Sure", "Here is", "Below is", or any other introduction. Directly output your revised content that is ready to be published. Preserving HTML tables if exist, never use tripple backticks html to wrap html table.`;

@Injectable()
export class AnswerFinalizerAstVisitor {

    @Handler(AnswerFinalizerAst)
    handler(ast: AnswerFinalizerAst, ctx: WorkflowGraphAst) {
        return new Observable((obs) => {
            const abortController = new AbortController();

            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal
            };

            const run = async () => {
                if (wrappedCtx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                ast.state = 'running';
                ast.count += 1;
                obs.next({ ...ast });

                const model = useLlmModel({ model: 'deepseek-ai/DeepSeek-V3', temperature: 0.7 });

                const result = await model.invoke([
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'human', content: ast.markdown }
                ]);

                if (wrappedCtx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                const finalizedContent = result.content as string;

                if (finalizedContent.length < ast.markdown.length * 0.85) {
                    ast.finalized.next(ast.markdown);
                } else {
                    ast.finalized.next(finalizedContent);
                }

                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
            };

            run().catch(e => {
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
}
