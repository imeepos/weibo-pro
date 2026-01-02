import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ErrorAnalyzerAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
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
  visit(ast: ErrorAnalyzerAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
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

          if (!ast.steps || ast.steps.length === 0) {
            throw new Error('请提供步骤日志');
          }

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
- recap：按时间顺序总结关键行动，突出模式,识别问题开始的位置
- blame：指出导致不足答案的具体步骤或模式
- improvement：提供可操作的建议，引导更好的结果
</指南>`;

          const userPrompt = `请分析以下步骤序列：

${stepsText}`;

          const structuredModel = model.withStructuredOutput(ErrorAnalysisSchema);
          const result = await structuredModel.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'human', content: userPrompt }
          ]);

          ast.recap = result.recap;
          ast.blame = result.blame;
          ast.improvement = result.improvement;

          return [
            { type: 'node_emit' as const, id: ast.id, data: { recap: ast.recap, blame: ast.blame, improvement: ast.improvement } }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
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
