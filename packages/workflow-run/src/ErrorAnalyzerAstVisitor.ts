import { Injectable } from '@sker/core';
import { Handler, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ErrorAnalyzerAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { useLlmModel } from './llm-client';

const ErrorAnalysisSchema = z.object({
  recap: z.string().describe('按时间顺序总结关键行动，识别问题开始的位置'),
  blame: z.string().describe('指出导致失败的具体步骤或模式'),
  improvement: z.string().describe('提供可操作的改进建议')
});

@Injectable()
export class ErrorAnalyzerAstVisitor {

  @Handler(ErrorAnalyzerAst)
  handler(ast: ErrorAnalyzerAst, ctx: WorkflowGraphAst) {
    return new Observable((obs) => {
      const abortController = new AbortController();

      const run = async () => {
        if (abortController.signal.aborted) {
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          return;
        }

        if (!ast.steps || ast.steps.length === 0) {
          ast.state = 'fail';
          setAstError(ast, new Error('请提供步骤日志'));
          obs.next({ ...ast });
          obs.complete();
          return;
        }

        ast.state = 'running';
        ast.count += 1;
        obs.next({ ...ast });

        const model = useLlmModel({
          model: ast.model,
          temperature: ast.temperature
        });

        const stepsText = ast.steps.filter(Boolean).join('\n\n');

        const systemPrompt = `你是搜索和推理过程分析专家。分析给定的步骤序列，识别问题所在。

<分析维度>
1. 采取的行动序列
2. 每步的有效性
3. 连续步骤间的逻辑
4. 可能的替代方法
5. 重复模式的迹象
6. 最终答案与累积信息的匹配度
</分析维度>

<指南>
- recap：按时间顺序总结关键行动，突出模式，识别问题开始的位置
- blame：指出导致不足答案的具体步骤或模式
- improvement：提供可操作的建议，引导更好的结果
</指南>`;

        const userPrompt = `请分析以下步骤序列：

${stepsText}`;

        try {
          const structuredModel = model.withStructuredOutput(ErrorAnalysisSchema);
          const result = await structuredModel.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'human', content: userPrompt }
          ]);

          if (abortController.signal.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            return;
          }

          ast.recap.next(result.recap);
          ast.blame.next(result.blame);
          ast.improvement.next(result.improvement);
          obs.next({ ...ast });

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();

        } catch (error) {
          throw new Error(`错误分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
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
