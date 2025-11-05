import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  WeiboPostEntity,
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';

/**
 * 分析用户的行为模式特征
 */
export const createAnalyzeUserBehaviorTool = () =>
  tool(
    async ({ userId, limit }) => {
      return useEntityManager(async (m) => {
        const posts = await m
          .getRepository(WeiboPostEntity)
          .createQueryBuilder('post')
          .where("post.user ->> 'id' = :userId", { userId: String(userId) })
          .orderBy('post.created_at', 'DESC')
          .limit(limit)
          .getMany();

        if (posts.length === 0) {
          return JSON.stringify({
            userId,
            message: '未找到该用户的帖子数据',
            behavior: null,
          });
        }

        const userInfo = posts[0]!.user;

        // 时间行为分析
        const postTimes = posts.map((p) => new Date(p.created_at));
        const hourDistribution = new Array(24).fill(0);
        const intervals: number[] = [];

        postTimes.forEach((time) => {
          hourDistribution[time.getHours()]++;
        });

        for (let i = 1; i < postTimes.length; i++) {
          const interval =
            (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) / 1000 / 60;
          intervals.push(interval);
        }

        const avgInterval =
          intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;
        const intervalStdDev = calculateStdDev(intervals);

        // 内容特征分析
        const texts = posts.map((p) => p.text);
        const avgTextLength =
          texts.reduce((sum, t) => sum + t.length, 0) / texts.length;

        const textSimilarity = calculateTextSimilarity(texts);

        // 互动特征分析
        const totalReposts = posts.reduce((sum, p) => sum + p.reposts_count, 0);
        const totalComments = posts.reduce(
          (sum, p) => sum + p.comments_count,
          0
        );
        const totalLikes = posts.reduce(
          (sum, p) => sum + p.attitudes_count,
          0
        );

        const avgReposts = totalReposts / posts.length;
        const avgComments = totalComments / posts.length;
        const avgLikes = totalLikes / posts.length;

        // 设备来源分析
        const sourceCounts = new Map<string, number>();
        posts.forEach((p) => {
          const source = extractSource(p.source);
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        });

        const topSources = Array.from(sourceCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([source, count]) => ({
            source,
            count,
            percentage: ((count / posts.length) * 100).toFixed(1),
          }));

        // 时间规律性评分（0-1，越高越规律，越可能是机器人）
        const timeRegularityScore = calculateTimeRegularity(
          hourDistribution,
          intervalStdDev,
          avgInterval
        );

        // 内容机械性评分（0-1，越高越机械）
        const contentMechanicalScore = calculateContentMechanical(
          textSimilarity,
          avgTextLength
        );

        return JSON.stringify({
          userId,
          userName: userInfo.screen_name,
          verified: userInfo.verified,
          analyzedPosts: posts.length,
          accountInfo: {
            followersCount: userInfo.status_total_counter?.total_cnt || '0',
            verified: userInfo.verified,
            verifiedType: userInfo.verified_type,
          },
          timeBehavior: {
            hourDistribution,
            mostActiveHours: hourDistribution
              .map((count, hour) => ({ hour, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map((h) => h.hour),
            avgPostInterval: Math.round(avgInterval),
            intervalStdDev: Math.round(intervalStdDev),
            regularityScore: timeRegularityScore,
          },
          contentFeatures: {
            avgTextLength: Math.round(avgTextLength),
            textSimilarity: textSimilarity,
            mechanicalScore: contentMechanicalScore,
          },
          interactionFeatures: {
            avgReposts: Math.round(avgReposts),
            avgComments: Math.round(avgComments),
            avgLikes: Math.round(avgLikes),
            totalInteractions: totalReposts + totalComments + totalLikes,
          },
          deviceSources: topSources,
        });
      });
    },
    {
      name: 'analyze_user_behavior',
      description: `分析用户的行为模式特征，用于识别异常账号。
【核心】从多维度分析用户行为模式：
  - 时间行为：发帖时间分布、间隔规律性
  - 内容特征：文本长度、相似度、机械性
  - 互动特征：平均转评赞数据
  - 设备来源：发帖设备分布
【输出】包含两个关键评分：
  - regularityScore（时间规律性）：0-1，越高越规律
  - mechanicalScore（内容机械性）：0-1，越高越机械
【用途】识别机器人、水军的基础工具。`,
      schema: z.object({
        userId: z.string().describe('用户 ID（必填）'),
        limit: z
          .number()
          .default(200)
          .describe('分析最近N条帖子，默认 200，建议100-500'),
      }),
    }
  );

/**
 * 检测用户是否存在异常行为特征（AI账号/水军/机器人）
 */
export const createDetectAbnormalUserTool = () =>
  tool(
    async ({ userId, limit, sensitivity }) => {
      return useEntityManager(async (m) => {
        const posts = await m
          .getRepository(WeiboPostEntity)
          .createQueryBuilder('post')
          .where("post.user ->> 'id' = :userId", { userId: String(userId) })
          .orderBy('post.created_at', 'DESC')
          .limit(limit)
          .getMany();

        if (posts.length === 0) {
          return JSON.stringify({
            userId,
            isAbnormal: false,
            confidence: 0,
            message: '未找到该用户的帖子数据',
          });
        }

        const userInfo = posts[0]!.user;

        // 获取该用户的NLP分析结果
        const nlpResults = await m
          .getRepository(PostNLPResultEntity)
          .createQueryBuilder('nlp')
          .leftJoinAndSelect('nlp.post', 'post')
          .where("post.user ->> 'id' = :userId", { userId: String(userId) })
          .limit(limit)
          .getMany();

        const abnormalSignals: Array<{
          type: string;
          severity: 'low' | 'medium' | 'high';
          description: string;
          value: any;
        }> = [];

        // 信号1: 时间行为异常
        const postTimes = posts.map((p) => new Date(p.created_at));
        const hourDistribution = new Array(24).fill(0);
        postTimes.forEach((time) => {
          hourDistribution[time.getHours()]++;
        });

        const nightPosts = hourDistribution.slice(0, 6).reduce((a, b) => a + b, 0);
        const nightPostRatio = nightPosts / posts.length;

        if (nightPostRatio > 0.3) {
          abnormalSignals.push({
            type: 'night_activity',
            severity: 'medium',
            description: `凌晨(0-6点)活跃度异常：${(nightPostRatio * 100).toFixed(1)}% 的帖子发布于凌晨`,
            value: nightPostRatio,
          });
        }

        // 计算发帖间隔
        const intervals: number[] = [];
        for (let i = 1; i < postTimes.length; i++) {
          const interval =
            (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) / 1000 / 60;
          intervals.push(interval);
        }

        const intervalStdDev = calculateStdDev(intervals);
        const avgInterval =
          intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;

        if (intervalStdDev < avgInterval * 0.3 && intervals.length > 10) {
          abnormalSignals.push({
            type: 'regular_interval',
            severity: 'high',
            description: `发帖间隔高度规律（标准差 ${intervalStdDev.toFixed(1)}分钟，平均间隔 ${avgInterval.toFixed(1)}分钟），疑似定时任务`,
            value: { stdDev: intervalStdDev, avg: avgInterval },
          });
        }

        // 信号2: 短时间爆发式发帖
        const recentHourPosts = posts.filter(
          (p) =>
            new Date(p.created_at).getTime() >
            Date.now() - 60 * 60 * 1000
        ).length;

        if (recentHourPosts > 20) {
          abnormalSignals.push({
            type: 'burst_posting',
            severity: 'high',
            description: `1小时内发帖 ${recentHourPosts} 条，疑似爆发式刷屏`,
            value: recentHourPosts,
          });
        }

        // 信号3: 文本高度相似
        const texts = posts.slice(0, 50).map((p) => p.text);
        const textSimilarity = calculateTextSimilarity(texts);

        if (textSimilarity > 0.7) {
          abnormalSignals.push({
            type: 'high_similarity',
            severity: 'high',
            description: `文本相似度 ${(textSimilarity * 100).toFixed(1)}%，疑似复制粘贴或模板化`,
            value: textSimilarity,
          });
        }

        // 信号4: 情感极端化
        if (nlpResults.length > 10) {
          const sentiments = nlpResults.map((r) => r.sentiment.overall);
          const positiveCount = sentiments.filter((s) => s === 'positive').length;
          const negativeCount = sentiments.filter((s) => s === 'negative').length;
          const extremeRatio = Math.max(positiveCount, negativeCount) / sentiments.length;

          if (extremeRatio > 0.85) {
            abnormalSignals.push({
              type: 'extreme_sentiment',
              severity: 'medium',
              description: `情感极端化：${(extremeRatio * 100).toFixed(1)}% 的帖子为${positiveCount > negativeCount ? '正面' : '负面'}情感，缺乏中性表达`,
              value: { extremeRatio, dominant: positiveCount > negativeCount ? 'positive' : 'negative' },
            });
          }
        }

        // 信号5: 互动异常（互动量极低或极高）
        const avgInteractions =
          posts.reduce(
            (sum, p) =>
              sum + p.reposts_count + p.comments_count + p.attitudes_count,
            0
          ) / posts.length;

        if (avgInteractions < 1 && posts.length > 20) {
          abnormalSignals.push({
            type: 'low_interaction',
            severity: 'low',
            description: `平均互动量极低（${avgInteractions.toFixed(2)}），疑似僵尸账号或被屏蔽`,
            value: avgInteractions,
          });
        }

        // 信号6: 单一设备来源
        const sourceCounts = new Map<string, number>();
        posts.forEach((p) => {
          const source = extractSource(p.source);
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        });

        const maxSourceCount = Math.max(...Array.from(sourceCounts.values()));
        const singleSourceRatio = maxSourceCount / posts.length;

        if (singleSourceRatio > 0.95 && posts.length > 50) {
          abnormalSignals.push({
            type: 'single_device',
            severity: 'low',
            description: `${(singleSourceRatio * 100).toFixed(1)}% 的帖子来自同一设备，缺乏设备多样性`,
            value: singleSourceRatio,
          });
        }

        // 综合评分
        const severityWeights = { low: 1, medium: 2, high: 3 };
        const totalScore = abnormalSignals.reduce(
          (sum, signal) => sum + severityWeights[signal.severity],
          0
        );

        const maxScore = 15; // 假设最多5个高危信号
        const abnormalityScore = Math.min(totalScore / maxScore, 1);

        // 根据敏感度阈值判断
        const thresholds = {
          low: 0.2,    // 宽松
          medium: 0.35, // 中等
          high: 0.5,    // 严格
        };

        const isAbnormal = abnormalityScore >= thresholds[sensitivity];

        // 账号类型推断
        let accountType = 'normal';
        let confidence = 0;

        if (isAbnormal) {
          const signalTypes = abnormalSignals.map((s) => s.type);

          if (
            signalTypes.includes('regular_interval') &&
            signalTypes.includes('high_similarity')
          ) {
            accountType = 'bot';
            confidence = 0.85;
          } else if (
            signalTypes.includes('burst_posting') ||
            signalTypes.includes('extreme_sentiment')
          ) {
            accountType = 'troll';
            confidence = 0.75;
          } else if (signalTypes.includes('low_interaction')) {
            accountType = 'zombie';
            confidence = 0.65;
          } else {
            accountType = 'suspicious';
            confidence = abnormalityScore;
          }
        }

        return JSON.stringify({
          userId,
          userName: userInfo.screen_name,
          analyzedPosts: posts.length,
          isAbnormal,
          accountType,
          confidence: parseFloat(confidence.toFixed(2)),
          abnormalityScore: parseFloat(abnormalityScore.toFixed(2)),
          abnormalSignals: abnormalSignals.sort(
            (a, b) =>
              severityWeights[b.severity] - severityWeights[a.severity]
          ),
          recommendation: isAbnormal
            ? `检测到 ${abnormalSignals.length} 个异常信号，建议进一步人工审核`
            : '未发现明显异常特征',
        });
      });
    },
    {
      name: 'detect_abnormal_user',
      description: `检测用户是否为AI账号/水军/推手/机器人。
【核心】综合多维度异常信号检测：
  - 时间异常：凌晨活跃、发帖间隔规律
  - 行为异常：短时爆发式发帖、单一设备
  - 内容异常：高文本相似度、模板化
  - 情感异常：极端化、缺乏中性表达
  - 互动异常：极低互动量（僵尸号）
【输出】包含：
  - isAbnormal: 是否异常
  - accountType: bot(机器人)/troll(水军)/zombie(僵尸号)/suspicious(可疑)/normal
  - confidence: 置信度 (0-1)
  - abnormalSignals: 详细异常信号列表
【敏感度】支持三档：
  - low: 宽松（20%阈值），减少误报
  - medium: 中等（35%阈值），平衡
  - high: 严格（50%阈值），只标记高可信异常
【用途】自动化识别异常账号的核心工具。`,
      schema: z.object({
        userId: z.string().describe('用户 ID（必填）'),
        limit: z
          .number()
          .default(200)
          .describe('分析最近N条帖子，默认 200'),
        sensitivity: z
          .enum(['low', 'medium', 'high'])
          .default('medium')
          .describe('检测敏感度：low=宽松, medium=中等, high=严格'),
      }),
    }
  );

// 辅助函数
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateTextSimilarity(texts: string[]): number {
  if (texts.length < 2) return 0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < Math.min(texts.length, 20); i++) {
    for (let j = i + 1; j < Math.min(texts.length, 20); j++) {
      const sim = simpleSimilarity(texts[i]!, texts[j]!);
      totalSimilarity += sim;
      comparisons++;
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

function simpleSimilarity(str1: string, str2: string): number {
  const tokens1 = new Set(str1.split(''));
  const tokens2 = new Set(str2.split(''));

  const intersection = new Set(
    [...tokens1].filter((x) => tokens2.has(x))
  );
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

function extractSource(sourceHtml: string): string {
  const match = sourceHtml.match(/>([^<]+)</);
  return match ? match[1]! : 'unknown';
}

function calculateTimeRegularity(
  hourDist: number[],
  stdDev: number,
  avgInterval: number
): number {
  const maxCount = Math.max(...hourDist);
  const variance = hourDist.reduce(
    (sum, count) => sum + Math.pow(count - maxCount / 24, 2),
    0
  );
  const evenness = 1 - Math.sqrt(variance) / (maxCount || 1);

  const intervalRegularity =
    avgInterval > 0 ? 1 - Math.min(stdDev / avgInterval, 1) : 0;

  return (evenness * 0.4 + intervalRegularity * 0.6);
}

function calculateContentMechanical(
  similarity: number,
  avgLength: number
): number {
  const similarityScore = similarity;
  const lengthVariance = avgLength < 50 || avgLength > 200 ? 0.3 : 0;

  return Math.min(similarityScore + lengthVariance, 1);
}
