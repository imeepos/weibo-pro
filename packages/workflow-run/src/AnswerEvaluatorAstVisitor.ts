import { Injectable } from "@sker/core";
import { Handler, setAstError, WorkflowGraphAst } from "@sker/workflow";
import { AnswerEvaluatorAst, EvaluationResult, EvaluationType } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { useLlmModel } from "./llm-client";

const EVALUATION_PROMPTS: Record<EvaluationType, string> = {
  definitive: `评估答案是否明确。拒绝以下模式：
- 个人不确定："I don't know", "不确定", "可能", "也许"
- 信息缺失："不存在", "缺乏信息", "无法找到"
- 无能力声明："无法提供", "不能回答"

返回 JSON: { "passed": boolean, "score": 0-100, "reason": "简短原因" }`,

  freshness: `评估答案时效性。根据内容类型判断：
- 实时数据（金融、股票）：需要当天数据
- 突发新闻：1天内
- 科学发现：60天内
- 教程内容：180天内
- 历史事实：无时效要求

返回 JSON: { "passed": boolean, "score": 0-100, "reason": "简短原因" }`,

  plurality: `评估答案是否提供了足够数量的项目：
- 明确计数（"3个"）：精确匹配
- "Few"/"少数"：2-4项
- "Several"/"几个"：3-7项
- "Many"/"很多"：7+项
- "Comprehensive"/"全面"：10+项

返回 JSON: { "passed": boolean, "score": 0-100, "reason": "简短原因" }`,

  completeness: `评估答案是否覆盖问题中所有明确提及的方面。
检查每个要求是否都有对应回答。

返回 JSON: { "passed": boolean, "score": 0-100, "reason": "简短原因" }`,

  strict: `你是一个严格的答案评估者，训练目标是拒绝浅薄的答案。
你无法容忍任何肤浅的回答。识别每一个缺失的细节。

首先，用最强有力的论据反驳这个答案。
然后，为这个答案辩护。
最后，给出你的判断。

返回 JSON: { "passed": boolean, "score": 0-100, "reason": "简短原因" }`
};

@Injectable()
export class AnswerEvaluatorAstVisitor {

  @Handler(AnswerEvaluatorAst)
  handler(ast: AnswerEvaluatorAst, ctx: WorkflowGraphAst) {
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

        const model = useLlmModel({
          model: ast.model,
          temperature: ast.temperature
        });

        const results: EvaluationResult[] = [];
        let totalScore = 0;

        for (const type of ast.evaluationTypes) {
          if (wrappedCtx.abortSignal?.aborted) break;

          const prompt = EVALUATION_PROMPTS[type];
          const userMessage = `问题：${ast.question}\n\n答案：${ast.answer}`;

          try {
            const result = await model.invoke([
              { role: 'system', content: prompt },
              { role: 'human', content: userMessage }
            ]);

            const content = result.content as string;
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
              const evaluation = JSON.parse(jsonMatch[0]);
              results.push({
                type,
                passed: evaluation.passed,
                score: evaluation.score,
                reason: evaluation.reason
              });
              totalScore += evaluation.score;
            }
          } catch (e) {
            results.push({
              type,
              passed: false,
              score: 0,
              reason: `评估失败: ${e instanceof Error ? e.message : '未知错误'}`
            });
          }
        }

        if (wrappedCtx.abortSignal?.aborted) {
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          return;
        }

        const avgScore = results.length > 0 ? totalScore / results.length : 0;
        const allPassed = results.every(r => r.passed);

        ast.results.next(results);
        ast.totalScore.next(avgScore);
        ast.passed.next(allPassed);

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
