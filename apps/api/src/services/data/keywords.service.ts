import { Injectable } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { PostNLPResultEntity } from '@sker/entities';
import { KeywordData } from './types';

@Injectable({ providedIn: 'root' })
export class KeywordsService {

  async getWordCloud(maxWords: number): Promise<KeywordData[]> {
    return useEntityManager(async (manager) => {
      const results = await manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .select('nlp.keywords')
        .where('nlp.keywords IS NOT NULL')
        .andWhere('jsonb_array_length(nlp.keywords) > 0')
        .getMany();

      if (results.length === 0) {
        return [];
      }

      const keywordMap = new Map<string, { weight: number; sentiments: string[] }>();

      results.forEach(result => {
        result.keywords.forEach((keyword: any) => {
          const existing = keywordMap.get(keyword.keyword) || { weight: 0, sentiments: [] };
          keywordMap.set(keyword.keyword, {
            weight: existing.weight + keyword.weight,
            sentiments: [...existing.sentiments, keyword.sentiment]
          });
        });
      });

      const keywords = Array.from(keywordMap.entries())
        .map(([keyword, data]) => ({
          keyword,
          weight: Math.round(data.weight * 100),
          sentiment: this.calculateOverallSentiment(data.sentiments)
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, maxWords);

      return keywords;
    });
  }

  private calculateOverallSentiment(sentiments: string[]): 'positive' | 'negative' | 'neutral' {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    sentiments.forEach(sentiment => {
      counts[sentiment as keyof typeof counts]++;
    });

    const max = Math.max(counts.positive, counts.negative, counts.neutral);
    if (max === counts.positive) return 'positive';
    if (max === counts.negative) return 'negative';
    return 'neutral';
  }
}