import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PromptOptimizerAst, EvaluationDimension } from '@sker/workflow-ast';

describe('PromptOptimizerAst', () => {
  describe('AST Node Definition', () => {
    it('should create instance with default values', () => {
      const ast = new PromptOptimizerAst();

      expect(ast.type).toBe('PromptOptimizerAst');
      expect(ast.targetOutput).toBe('');
      expect(ast.targetContext).toBe('');
      expect(ast.initialPrompt).toBe('');
      expect(ast.maxIterations).toBe(5);
      expect(ast.targetScore).toBe(85);
      expect(ast.testRuns).toBe(3);
    });

    it('should have correct default evaluation dimensions', () => {
      const ast = new PromptOptimizerAst();

      expect(ast.evaluationDimensions).toHaveLength(3);
      expect(ast.evaluationDimensions[0].name).toBe('语义相似度');
      expect(ast.evaluationDimensions[0].weight).toBe(0.4);
    });

    it('should have correct LLM configuration defaults', () => {
      const ast = new PromptOptimizerAst();

      expect(ast.generatorModel).toBe('deepseek-ai/DeepSeek-V3.2');
      expect(ast.testerModel).toBe('deepseek-ai/DeepSeek-V3.2');
      expect(ast.evaluatorModel).toBe('deepseek-ai/DeepSeek-V3.2');
      expect(ast.generatorTemperature).toBe(0.7);
      expect(ast.testerTemperature).toBe(0.3);
      expect(ast.evaluatorTemperature).toBe(0.2);
    });

    it('should allow customization of all properties', () => {
      const ast = new PromptOptimizerAst();

      ast.targetOutput = 'Custom target output';
      ast.targetContext = 'Custom context';
      ast.initialPrompt = 'Custom initial prompt';
      ast.maxIterations = 10;
      ast.targetScore = 90;
      ast.testRuns = 5;

      const customDimensions: EvaluationDimension[] = [
        { name: '准确性', weight: 0.5, description: '输出准确性' },
        { name: '完整性', weight: 0.5, description: '输出完整性' },
      ];
      ast.evaluationDimensions = customDimensions;

      expect(ast.targetOutput).toBe('Custom target output');
      expect(ast.targetContext).toBe('Custom context');
      expect(ast.initialPrompt).toBe('Custom initial prompt');
      expect(ast.maxIterations).toBe(10);
      expect(ast.targetScore).toBe(90);
      expect(ast.testRuns).toBe(5);
      expect(ast.evaluationDimensions).toEqual(customDimensions);
    });
  });

  describe('Output Properties', () => {
    it('should have correct default output values', () => {
      const ast = new PromptOptimizerAst();

      expect(ast.result).toBeNull();
      expect(ast.bestPrompt).toBe('');
      expect(ast.bestScore).toBe(0);
      expect(ast.success).toBe(false);
    });

    it('should allow setting output values', () => {
      const ast = new PromptOptimizerAst();

      ast.bestPrompt = 'Optimized prompt';
      ast.bestScore = 92.5;
      ast.success = true;
      ast.result = {
        success: true,
        iterations: 3,
        bestPrompt: 'Optimized prompt',
        bestScore: 92.5,
        versions: [],
        duration: 5000,
      };

      expect(ast.bestPrompt).toBe('Optimized prompt');
      expect(ast.bestScore).toBe(92.5);
      expect(ast.success).toBe(true);
      expect(ast.result).not.toBeNull();
      expect(ast.result?.iterations).toBe(3);
    });
  });

  describe('State Properties', () => {
    it('should have correct default state values', () => {
      const ast = new PromptOptimizerAst();

      expect(ast.currentIteration).toBe(0);
      expect(ast.versionHistory).toEqual([]);
    });

    it('should allow updating state during execution', () => {
      const ast = new PromptOptimizerAst();

      ast.currentIteration = 3;
      ast.versionHistory = [
        { versionNumber: 1, prompt: 'v1', score: 70, improvements: 'Better wording' },
        { versionNumber: 2, prompt: 'v2', score: 80, improvements: 'More specific' },
        { versionNumber: 3, prompt: 'v3', score: 85, improvements: 'Added examples' },
      ];

      expect(ast.currentIteration).toBe(3);
      expect(ast.versionHistory).toHaveLength(3);
      expect(ast.versionHistory[2].score).toBe(85);
    });
  });
});

describe('Optimization Algorithm Scenarios', () => {
  describe('Score Calculation', () => {
    it('should calculate weighted score correctly', () => {
      const dimensions: EvaluationDimension[] = [
        { name: 'A', weight: 0.4, description: '' },
        { name: 'B', weight: 0.3, description: '' },
        { name: 'C', weight: 0.3, description: '' },
      ];

      const scores = { A: 90, B: 80, C: 70 };

      // 加权计算: (90*0.4 + 80*0.3 + 70*0.3) = 36 + 24 + 21 = 81
      const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
      const weightedScore = dimensions.reduce(
        (sum, d) => sum + (scores[d.name as keyof typeof scores] || 0) * d.weight,
        0
      ) / totalWeight;

      expect(weightedScore).toBe(81);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty target output gracefully', () => {
      const ast = new PromptOptimizerAst();
      ast.targetOutput = '';

      // AST 创建应该成功，验证在 Visitor 中处理
      expect(ast.targetOutput).toBe('');
    });

    it('should handle zero iterations', () => {
      const ast = new PromptOptimizerAst();
      ast.maxIterations = 0;

      expect(ast.maxIterations).toBe(0);
    });

    it('should handle very high target score', () => {
      const ast = new PromptOptimizerAst();
      ast.targetScore = 100;

      expect(ast.targetScore).toBe(100);
    });
  });
});
