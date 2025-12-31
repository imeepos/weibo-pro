import { Injectable } from '@sker/core';
import { NLPAnalyzer, type PostContext, type CompleteAnalysisResult } from '@sker/nlp';
import type { SentimentResult, KeywordResult } from './types';

@Injectable()
export class SentimentAnalyzer {
  constructor(private readonly nlpAnalyzer: NLPAnalyzer) {}

  async analyzeSentiment(context: PostContext): Promise<SentimentResult> {
    const result = await this.nlpAnalyzer.analyze(context);
    return result.sentiment;
  }

  async analyzeWithKeywords(context: PostContext): Promise<{
    sentiment: SentimentResult;
    keywords: KeywordResult[];
  }> {
    const result = await this.nlpAnalyzer.analyze(context);
    return {
      sentiment: result.sentiment,
      keywords: result.keywords,
    };
  }

  async analyzeComplete(
    context: PostContext,
    options?: {
      availableCategories?: string[];
      availableTags?: string[];
      recentEvents?: Array<{ title: string; description?: string }>;
    }
  ): Promise<CompleteAnalysisResult> {
    return this.nlpAnalyzer.analyze(
      context
    );
  }
}
