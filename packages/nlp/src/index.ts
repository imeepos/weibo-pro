import { NLPAnalyzer } from './NLPAnalyzer';

export * from './openai';
export * from './types';
export { NLPAnalyzer } from './NLPAnalyzer';

/**
 * 单例模式：获取 NLP 分析器实例
 */
let analyzerInstance: NLPAnalyzer | null = null;

export function getNLPAnalyzer(): NLPAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new NLPAnalyzer();
  }
  return analyzerInstance;
}