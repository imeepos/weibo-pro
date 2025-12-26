import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import {
  PromptOptimizerAst,
  OptimizationResult,
  PromptVersionSummary,
  EvaluationDimension,
} from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from './llm-client';

/**
 * 提示词优化器执行器
 *
 * 核心算法：
 * 1. 分析目标输出，提取关键特征
 * 2. 生成初始提示词（或使用用户提供的）
 * 3. 使用提示词调用 AI，获取实际输出
 * 4. 评估实际输出与目标的匹配度
 * 5. 基于评估结果优化提示词
 * 6. 重复 3-5 直到达到目标分数或最大迭代次数
 */
@Injectable()
export class PromptOptimizerAstVisitor {
  /**
   * 生成/优化提示词的系统提示
   */
  private readonly GENERATOR_SYSTEM_PROMPT = `你是一位提示词优化专家，精通 AI 提示工程。

你的任务是根据目标输出，生成或优化能够产生该输出的提示词。

## 工作原则
1. **逆向思维**：从输出推导输入，思考什么样的提示词能产生这样的输出
2. **精准表达**：提示词要清晰、具体、无歧义
3. **结构化设计**：使用 Markdown 格式，层次分明
4. **关注细节**：捕捉目标输出中的格式、语气、专业术语等特征

## 输出格式
返回 JSON:
{
  "prompt": "优化后的提示词",
  "rationale": "优化思路说明（为什么这样设计提示词）"
}`;

  /**
   * 评估结果的系统提示
   */
  private readonly EVALUATOR_SYSTEM_PROMPT = `你是一位提示词效果评估专家。

你的任务是对比"目标输出"和"实际输出"，评估它们的匹配程度。

## 评估维度
你需要对以下维度进行评分（0-100 分）：
{{DIMENSIONS}}

## 评估原则
1. **客观公正**：基于事实评分，不带偏见
2. **具体反馈**：指出具体的匹配点和差异点
3. **可操作建议**：提供明确的改进方向

## 输出格式
返回 JSON:
{
  "dimensionScores": {
    "维度1": 分数,
    "维度2": 分数
  },
  "feedback": "整体评估反馈",
  "suggestions": "具体改进建议"
}`;

  @Handler(PromptOptimizerAst)
  visit(
    ast: PromptOptimizerAst,
    input$: Observable<Record<string, unknown>>,
    ctx: WorkflowGraphAst
  ) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();
      const startTime = Date.now();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$
        .pipe(
          concatMap(async (inputData) => {
            ast.emitCount += 1;

            // 合并输入数据
            if (inputData) {
              Object.keys(inputData).forEach((key) => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }

            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            // 执行优化流程
            const result = await this.runOptimization(ast, abortController.signal);

            return [
              {
                type: 'node_emit' as const,
                id: ast.id,
                data: {
                  result,
                  bestPrompt: result.bestPrompt,
                  bestScore: result.bestScore,
                  success: result.success,
                },
              },
            ];
          }),
          mergeMap((events: NodeEvent[]) => from(events))
        )
        .subscribe({
          next: (event: NodeEvent) => {
            obs.next(event);
          },
          error: (error) => {
            ast.state = 'fail';
            setAstError(ast, error);
            obs.next({
              type: 'node_fail',
              id: ast.id,
              error: ast.error?.message,
            });
            obs.complete();
          },
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          },
        });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  /**
   * 执行完整的优化流程
   */
  private async runOptimization(
    ast: PromptOptimizerAst,
    signal: AbortSignal
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const versions: PromptVersionSummary[] = [];

    let currentPrompt = ast.initialPrompt || '';
    let bestPrompt = '';
    let bestScore = 0;
    let iteration = 0;

    console.log(`[PromptOptimizer] 开始优化，目标分数: ${ast.targetScore}，最大迭代: ${ast.maxIterations}`);

    // 如果没有初始提示词，先生成一个
    if (!currentPrompt) {
      console.log('[PromptOptimizer] 生成初始提示词...');
      const generated = await this.generatePrompt(
        ast.targetOutput,
        ast.targetContext,
        null, // 无评估反馈
        ast.generatorModel,
        ast.generatorTemperature,
        signal
      );
      currentPrompt = generated.prompt;
      console.log(`[PromptOptimizer] 初始提示词生成完成（${currentPrompt.length} 字）`);
    }

    // 迭代优化循环
    while (iteration < ast.maxIterations) {
      if (signal.aborted) {
        throw new Error('优化过程已取消');
      }

      iteration++;
      ast.currentIteration = iteration;
      console.log(`[PromptOptimizer] === 迭代 ${iteration}/${ast.maxIterations} ===`);

      // 1. 使用当前提示词进行多次测试
      const testOutputs: string[] = [];
      for (let t = 0; t < ast.testRuns; t++) {
        if (signal.aborted) break;
        console.log(`[PromptOptimizer] 测试 ${t + 1}/${ast.testRuns}...`);
        const output = await this.testPrompt(
          currentPrompt,
          ast.testerModel,
          ast.testerTemperature,
          signal
        );
        testOutputs.push(output);
      }

      // 2. 评估测试结果
      console.log('[PromptOptimizer] 评估测试结果...');
      const evaluation = await this.evaluateOutputs(
        ast.targetOutput,
        testOutputs,
        ast.evaluationDimensions,
        ast.evaluatorModel,
        ast.evaluatorTemperature,
        signal
      );

      // 3. 记录版本
      const versionSummary: PromptVersionSummary = {
        versionNumber: iteration,
        prompt: currentPrompt,
        score: evaluation.totalScore,
        improvements: evaluation.suggestions,
      };
      versions.push(versionSummary);
      ast.versionHistory = versions;

      console.log(`[PromptOptimizer] 迭代 ${iteration} 得分: ${evaluation.totalScore.toFixed(2)}`);

      // 4. 更新最佳结果
      if (evaluation.totalScore > bestScore) {
        bestScore = evaluation.totalScore;
        bestPrompt = currentPrompt;
        console.log(`[PromptOptimizer] 发现更优提示词，分数: ${bestScore.toFixed(2)}`);
      }

      // 5. 检查是否达到目标
      if (evaluation.totalScore >= ast.targetScore) {
        console.log(`[PromptOptimizer] 达到目标分数 ${ast.targetScore}，优化完成！`);
        break;
      }

      // 6. 如果还有迭代次数，生成优化后的提示词
      if (iteration < ast.maxIterations) {
        console.log('[PromptOptimizer] 根据反馈优化提示词...');
        const optimized = await this.generatePrompt(
          ast.targetOutput,
          ast.targetContext,
          {
            currentPrompt,
            feedback: evaluation.feedback,
            suggestions: evaluation.suggestions,
            dimensionScores: evaluation.dimensionScores,
          },
          ast.generatorModel,
          ast.generatorTemperature,
          signal
        );
        currentPrompt = optimized.prompt;
        console.log(`[PromptOptimizer] 优化后提示词（${currentPrompt.length} 字）`);
      }
    }

    const result: OptimizationResult = {
      success: bestScore >= ast.targetScore,
      iterations: iteration,
      bestPrompt,
      bestScore,
      versions,
      duration: Date.now() - startTime,
    };

    // 更新 AST 输出
    ast.result = result;
    ast.bestPrompt = bestPrompt;
    ast.bestScore = bestScore;
    ast.success = result.success;

    console.log(`[PromptOptimizer] 优化完成，最终分数: ${bestScore.toFixed(2)}，耗时: ${result.duration}ms`);

    return result;
  }

  /**
   * 生成或优化提示词
   */
  private async generatePrompt(
    targetOutput: string,
    targetContext: string,
    previousEvaluation: {
      currentPrompt: string;
      feedback: string;
      suggestions: string;
      dimensionScores: Record<string, number>;
    } | null,
    model: string,
    temperature: number,
    signal: AbortSignal
  ): Promise<{ prompt: string; rationale: string }> {
    const llm = useLlmModel({ model, temperature });

    let userMessage = `## 目标输出
${targetOutput}

## 上下文说明
${targetContext || '无额外上下文'}
`;

    if (previousEvaluation) {
      userMessage += `
## 当前提示词
${previousEvaluation.currentPrompt}

## 评估反馈
${previousEvaluation.feedback}

## 各维度得分
${JSON.stringify(previousEvaluation.dimensionScores, null, 2)}

## 改进建议
${previousEvaluation.suggestions}

请基于以上反馈，优化提示词以提高匹配度。`;
    } else {
      userMessage += `
请分析目标输出的特征，生成一个能够产生类似输出的提示词。`;
    }

    const result = await llm.invoke([
      { role: 'system', content: this.GENERATOR_SYSTEM_PROMPT },
      { role: 'human', content: userMessage },
    ]);

    const content = result.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parseResult = parseWithHarmony(jsonMatch[0]);
      if (parseResult.data && typeof parseResult.data === 'object') {
        const data = parseResult.data as { prompt?: string; rationale?: string };
        return {
          prompt: data.prompt || content,
          rationale: data.rationale || '',
        };
      }
    }

    // 如果解析失败，返回原始内容作为提示词
    return {
      prompt: content,
      rationale: '无法解析 JSON，使用原始输出',
    };
  }

  /**
   * 使用提示词测试 AI 输出
   */
  private async testPrompt(
    prompt: string,
    model: string,
    temperature: number,
    signal: AbortSignal
  ): Promise<string> {
    const llm = useLlmModel({ model, temperature });

    const result = await llm.invoke([
      { role: 'system', content: prompt },
      { role: 'human', content: '请按照你的角色设定执行任务。' },
    ]);

    return result.content as string;
  }

  /**
   * 评估测试输出与目标的匹配度
   */
  private async evaluateOutputs(
    targetOutput: string,
    testOutputs: string[],
    dimensions: EvaluationDimension[],
    model: string,
    temperature: number,
    signal: AbortSignal
  ): Promise<{
    dimensionScores: Record<string, number>;
    totalScore: number;
    feedback: string;
    suggestions: string;
  }> {
    const llm = useLlmModel({ model, temperature });

    // 构建维度说明
    const dimensionsText = dimensions
      .map((d) => `- **${d.name}**（权重 ${(d.weight * 100).toFixed(0)}%）：${d.description}`)
      .join('\n');

    const systemPrompt = this.EVALUATOR_SYSTEM_PROMPT.replace('{{DIMENSIONS}}', dimensionsText);

    const userMessage = `## 目标输出
${targetOutput}

## 实际测试输出（${testOutputs.length} 次）
${testOutputs.map((o, i) => `### 测试 ${i + 1}\n${o}`).join('\n\n')}

请评估实际输出与目标的匹配程度。`;

    const result = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'human', content: userMessage },
    ]);

    const content = result.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parseResult = parseWithHarmony(jsonMatch[0]);
      if (parseResult.data && typeof parseResult.data === 'object') {
        const data = parseResult.data as {
          dimensionScores?: Record<string, number>;
          feedback?: string;
          suggestions?: string;
        };

        const dimensionScores = data.dimensionScores || {};

        // 计算加权总分
        let totalScore = 0;
        let totalWeight = 0;
        for (const dim of dimensions) {
          const score = dimensionScores[dim.name] || 0;
          totalScore += score * dim.weight;
          totalWeight += dim.weight;
        }
        if (totalWeight > 0) {
          totalScore = totalScore / totalWeight;
        }

        return {
          dimensionScores,
          totalScore,
          feedback: data.feedback || '',
          suggestions: data.suggestions || '',
        };
      }
    }

    // 解析失败，返回默认值
    return {
      dimensionScores: {},
      totalScore: 0,
      feedback: '评估解析失败',
      suggestions: '请检查评估模型输出格式',
    };
  }
}
