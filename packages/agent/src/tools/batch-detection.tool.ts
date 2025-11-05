import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  WeiboPostEntity,
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';

/**
 * 批量检测事件中的异常账号
 */
export const createBatchDetectAbnormalUsersTool = () =>
  tool(
    async ({ eventId, minPosts, sensitivity, limit }) => {
      return useEntityManager(async (m) => {
        const results = await m
          .getRepository(PostNLPResultEntity)
          .createQueryBuilder('nlp')
          .leftJoinAndSelect('nlp.post', 'post')
          .where('nlp.event_id = :eventId', { eventId })
          .getMany();

        if (results.length === 0) {
          return JSON.stringify({
            eventId,
            abnormalUsers: [],
            message: '该事件暂无相关帖子数据',
          });
        }

        const userPostsMap = new Map<
          string,
          Array<{ post: WeiboPostEntity; nlp: PostNLPResultEntity }>
        >();

        results.forEach((r) => {
          const userId = String(r.post.user.id);
          if (!userPostsMap.has(userId)) {
            userPostsMap.set(userId, []);
          }
          userPostsMap.get(userId)!.push({ post: r.post, nlp: r });
        });

        const usersToAnalyze = Array.from(userPostsMap.entries())
          .filter(([_, posts]) => posts.length >= minPosts)
          .slice(0, limit);

        const abnormalUsers = [];

        for (const [userId, userPosts] of usersToAnalyze) {
          const posts = userPosts.map((up) => up.post);
          const nlpResults = userPosts.map((up) => up.nlp);
          const userInfo = posts[0]!.user;

          const abnormalSignals: Array<{
            type: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
          }> = [];

          // 时间行为分析
          const postTimes = posts.map((p) => new Date(p.created_at));
          const intervals: number[] = [];

          for (let i = 1; i < postTimes.length; i++) {
            const interval =
              (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) /
              1000 /
              60;
            intervals.push(interval);
          }

          const avgInterval =
            intervals.length > 0
              ? intervals.reduce((a, b) => a + b, 0) / intervals.length
              : 0;
          const intervalStdDev = calculateStdDev(intervals);

          if (intervalStdDev < avgInterval * 0.3 && intervals.length > 5) {
            abnormalSignals.push({
              type: 'regular_interval',
              severity: 'high',
              description: `发帖间隔高度规律，疑似定时任务`,
            });
          }

          // 短时间爆发
          const timeSpan =
            postTimes.length > 1
              ? (postTimes[0]!.getTime() -
                  postTimes[postTimes.length - 1]!.getTime()) /
                1000 /
                60 /
                60
              : 0;

          if (timeSpan < 2 && posts.length > 10) {
            abnormalSignals.push({
              type: 'burst_posting',
              severity: 'high',
              description: `2小时内发帖 ${posts.length} 条`,
            });
          }

          // 文本相似度
          const texts = posts.map((p) => p.text);
          const textSimilarity = calculateTextSimilarity(texts);

          if (textSimilarity > 0.7) {
            abnormalSignals.push({
              type: 'high_similarity',
              severity: 'high',
              description: `文本相似度 ${(textSimilarity * 100).toFixed(1)}%`,
            });
          }

          // 情感极端化
          const sentiments = nlpResults.map((r) => r.sentiment.overall);
          const positiveCount = sentiments.filter(
            (s) => s === 'positive'
          ).length;
          const negativeCount = sentiments.filter(
            (s) => s === 'negative'
          ).length;
          const extremeRatio =
            Math.max(positiveCount, negativeCount) / sentiments.length;

          if (extremeRatio > 0.85) {
            abnormalSignals.push({
              type: 'extreme_sentiment',
              severity: 'medium',
              description: `情感极端化 ${(extremeRatio * 100).toFixed(1)}%`,
            });
          }

          // 综合评分
          const severityWeights = { low: 1, medium: 2, high: 3 };
          const totalScore = abnormalSignals.reduce(
            (sum, signal) => sum + severityWeights[signal.severity],
            0
          );
          const maxScore = 15;
          const abnormalityScore = Math.min(totalScore / maxScore, 1);

          const thresholds = { low: 0.2, medium: 0.35, high: 0.5 };
          const isAbnormal = abnormalityScore >= thresholds[sensitivity];

          if (isAbnormal) {
            let accountType = 'suspicious';
            const signalTypes = abnormalSignals.map((s) => s.type);

            if (
              signalTypes.includes('regular_interval') &&
              signalTypes.includes('high_similarity')
            ) {
              accountType = 'bot';
            } else if (
              signalTypes.includes('burst_posting') ||
              signalTypes.includes('extreme_sentiment')
            ) {
              accountType = 'troll';
            }

            abnormalUsers.push({
              userId,
              userName: userInfo.screen_name,
              verified: userInfo.verified,
              postCount: posts.length,
              accountType,
              abnormalityScore: parseFloat(abnormalityScore.toFixed(2)),
              abnormalSignals: abnormalSignals.map((s) => ({
                type: s.type,
                severity: s.severity,
                description: s.description,
              })),
            });
          }
        }

        abnormalUsers.sort((a, b) => b.abnormalityScore - a.abnormalityScore);

        return JSON.stringify({
          eventId,
          totalUsers: userPostsMap.size,
          analyzedUsers: usersToAnalyze.length,
          abnormalCount: abnormalUsers.length,
          abnormalRatio: (
            (abnormalUsers.length / usersToAnalyze.length) *
            100
          ).toFixed(1),
          abnormalUsers: abnormalUsers.slice(0, 50),
          summary: {
            bots: abnormalUsers.filter((u) => u.accountType === 'bot').length,
            trolls: abnormalUsers.filter((u) => u.accountType === 'troll')
              .length,
            suspicious: abnormalUsers.filter(
              (u) => u.accountType === 'suspicious'
            ).length,
          },
        });
      });
    },
    {
      name: 'batch_detect_abnormal_users',
      description: `批量检测事件中的异常账号（水军/机器人）。
【核心】对事件中所有活跃用户进行异常检测，快速定位问题账号群体。
【检测维度】：
  - 发帖间隔规律性（机器人特征）
  - 短时爆发式发帖（刷屏行为）
  - 文本高相似度（复制粘贴）
  - 情感极端化（水军特征）
【筛选】：
  - minPosts: 最少发帖数，过滤偶然参与者
  - sensitivity: 检测敏感度（low/medium/high）
  - limit: 分析用户数量上限
【输出】：
  - 异常用户列表（按异常分数排序）
  - 账号类型分类（bot/troll/suspicious）
  - 统计摘要（各类异常账号数量、占比）
【用途】：
  - 识别事件中的水军操纵
  - 评估舆论真实性
  - 发现组织化刷评行为
推荐配合 analyze_event_influencers 使用：先找影响力人物，再检测是否为水军。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        minPosts: z
          .number()
          .default(3)
          .describe('最少发帖数筛选，默认 3'),
        sensitivity: z
          .enum(['low', 'medium', 'high'])
          .default('medium')
          .describe('检测敏感度：low=宽松, medium=中等, high=严格'),
        limit: z
          .number()
          .default(100)
          .describe('分析用户数量上限，默认 100'),
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

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}
