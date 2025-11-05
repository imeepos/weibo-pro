import { WeiboUserEntity } from '../weibo-user.entity';
import type { CategoryDimension } from '../weibo-user-category.entity';

export interface ClassificationResult {
  categoryCode: string;
  dimension: CategoryDimension;
  confidence: number;
  reason?: string;
}

export class UserCategoryClassifier {
  static classify(user: WeiboUserEntity): ClassificationResult[] {
    const results: ClassificationResult[] = [];

    results.push(...this.classifyByVerification(user));
    results.push(...this.classifyByInfluence(user));
    results.push(...this.classifyByCapability(user));
    results.push(...this.classifyByIndustry(user));

    return results;
  }

  private static classifyByVerification(
    user: WeiboUserEntity
  ): ClassificationResult[] {
    const results: ClassificationResult[] = [];

    if (!user.verified) {
      results.push({
        categoryCode: 'ordinary',
        dimension: 'verification',
        confidence: 1.0,
      });
      return results;
    }

    const verifiedType = user.verified_type ?? -1;

    switch (verifiedType) {
      case 0:
        results.push({
          categoryCode: 'personal_verified',
          dimension: 'verification',
          confidence: 1.0,
        });
        break;
      case 2:
      case 3:
      case 5:
        results.push({
          categoryCode: 'org_verified',
          dimension: 'verification',
          confidence: 1.0,
        });
        break;
      case 220:
        results.push({
          categoryCode: 'institution_verified',
          dimension: 'verification',
          confidence: 1.0,
        });
        break;
      default:
        results.push({
          categoryCode: 'other_verified',
          dimension: 'verification',
          confidence: 0.8,
          reason: `verified_type=${verifiedType}`,
        });
    }

    return results;
  }

  private static classifyByInfluence(
    user: WeiboUserEntity
  ): ClassificationResult[] {
    const results: ClassificationResult[] = [];
    const followers = user.followers_count ?? 0;

    if (followers >= 1_000_000) {
      results.push({
        categoryCode: 'top_influencer',
        dimension: 'influence',
        confidence: 1.0,
      });
    } else if (followers >= 100_000) {
      results.push({
        categoryCode: 'major_influencer',
        dimension: 'influence',
        confidence: 1.0,
      });
    } else if (followers >= 10_000) {
      results.push({
        categoryCode: 'mid_influencer',
        dimension: 'influence',
        confidence: 1.0,
      });
    } else if (followers >= 1_000) {
      results.push({
        categoryCode: 'micro_influencer',
        dimension: 'influence',
        confidence: 1.0,
      });
    } else {
      results.push({
        categoryCode: 'tail_user',
        dimension: 'influence',
        confidence: 1.0,
      });
    }

    return results;
  }

  private static classifyByCapability(
    user: WeiboUserEntity
  ): ClassificationResult[] {
    const results: ClassificationResult[] = [];

    if (user.brand_ability) {
      results.push({
        categoryCode: 'brand_account',
        dimension: 'capability',
        confidence: 1.0,
      });
    }

    if (user.ecommerce_ability) {
      results.push({
        categoryCode: 'ecommerce_account',
        dimension: 'capability',
        confidence: 1.0,
      });
    }

    if (user.live_ability) {
      results.push({
        categoryCode: 'live_streamer',
        dimension: 'capability',
        confidence: 1.0,
      });
    }

    if (user.video_status_count && user.video_status_count > 10) {
      results.push({
        categoryCode: 'video_creator',
        dimension: 'capability',
        confidence: 0.8,
      });
    }

    if (user.paycolumn_ability || user.wbcolumn_ability) {
      results.push({
        categoryCode: 'content_creator',
        dimension: 'capability',
        confidence: 0.9,
      });
    }

    return results;
  }

  private static classifyByIndustry(
    user: WeiboUserEntity
  ): ClassificationResult[] {
    const results: ClassificationResult[] = [];

    if (!user.verified_trade) {
      return results;
    }

    const trade = user.verified_trade.toLowerCase();
    const tradeMapping: Record<string, { code: string; confidence: number }> = {
      媒体: { code: 'media', confidence: 1.0 },
      新闻: { code: 'news', confidence: 1.0 },
      娱乐: { code: 'entertainment', confidence: 1.0 },
      影视: { code: 'entertainment', confidence: 0.9 },
      音乐: { code: 'entertainment', confidence: 0.9 },
      财经: { code: 'finance', confidence: 1.0 },
      金融: { code: 'finance', confidence: 1.0 },
      科技: { code: 'tech', confidence: 1.0 },
      互联网: { code: 'tech', confidence: 0.9 },
      体育: { code: 'sports', confidence: 1.0 },
      教育: { code: 'education', confidence: 1.0 },
      医疗: { code: 'healthcare', confidence: 1.0 },
      健康: { code: 'healthcare', confidence: 0.9 },
      政府: { code: 'government', confidence: 1.0 },
      公共服务: { code: 'government', confidence: 0.9 },
      企业: { code: 'corporate', confidence: 0.8 },
    };

    for (const [keyword, mapping] of Object.entries(tradeMapping)) {
      if (trade.includes(keyword)) {
        results.push({
          categoryCode: mapping.code,
          dimension: 'industry',
          confidence: mapping.confidence,
        });
        break;
      }
    }

    return results;
  }
}
