/**
 * 提示词优化器算法层
 *
 * 从 PromptOptimizerAstVisitor.ts 抽取的核心优化流程 runOptimization：
 * 1. 生成初始提示词（或使用用户提供的）
 * 2. 迭代：测试 → 评估 → 记录版本 → 更新最佳 → 优化提示词
 * 3. 直到达到目标分数或最大迭代次数
 *
 * LLM 交互逻辑委托给 PromptOptimizerLlm。
 */
import {
  PromptOptimizerAst,
  OptimizationResult,
  PromptVersionSummary,
} from '@sker/workflow-ast';
import { PromptOptimizerLlm } from './PromptOptimizerLlm';

export class PromptOptimizerExecutor {
  private llm: PromptOptimizerLlm;

  constructor() {
    this.llm = new PromptOptimizerLlm();
  }

  /**
   * 执行完整的优化流程
   */
  async runOptimization(
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
      const generated = await this.llm.generatePrompt(
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
        const output = await this.llm.testPrompt(
          currentPrompt,
          ast.testerModel,
          ast.testerTemperature,
          signal
        );
        testOutputs.push(output);
      }

      // 2. 评估测试结果
      console.log('[PromptOptimizer] 评估测试结果...');
      const evaluation = await this.llm.evaluateOutputs(
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
        const optimized = await this.llm.generatePrompt(
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
}
