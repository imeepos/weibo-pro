import { useMemo } from 'react';
import type { KOLAnalysisResult, KOLData } from '@sker/sdk';

export interface KOLStatistics {
  topKOLs: KOLData[];
  paretoIndex: number;
  kolContributionRatio: number;
  influenceDistribution: {
    high: number;    // influenceScore > 7
    medium: number;  // influenceScore 4-7
    low: number;     // influenceScore < 4
  };
  engagementDistribution: {
    high: number;    // engagementRate > 0.05
    medium: number;  // engagementRate 0.01-0.05
    low: number;     // engagementRate < 0.01
  };
}

export const useKOLInfluence = (
  kolData: KOLAnalysisResult | null
): KOLStatistics => {
  return useMemo<KOLStatistics>(() => {
    if (!kolData || kolData.topKOLs.length === 0) {
      return {
        topKOLs: [],
        paretoIndex: 0,
        kolContributionRatio: 0,
        influenceDistribution: { high: 0, medium: 0, low: 0 },
        engagementDistribution: { high: 0, medium: 0, low: 0 },
      };
    }

    const { topKOLs, paretoIndex, kolContributionRatio } = kolData;

    // 计算影响力分布
    const influenceDistribution = {
      high: topKOLs.filter(kol => kol.influenceScore > 7).length,
      medium: topKOLs.filter(kol => kol.influenceScore >= 4 && kol.influenceScore <= 7).length,
      low: topKOLs.filter(kol => kol.influenceScore < 4).length,
    };

    // 计算互动率分布
    const engagementDistribution = {
      high: topKOLs.filter(kol => kol.engagementRate > 0.05).length,
      medium: topKOLs.filter(kol => kol.engagementRate >= 0.01 && kol.engagementRate <= 0.05).length,
      low: topKOLs.filter(kol => kol.engagementRate < 0.01).length,
    };

    return {
      topKOLs,
      paretoIndex,
      kolContributionRatio,
      influenceDistribution,
      engagementDistribution,
    };
  }, [kolData]);
};
