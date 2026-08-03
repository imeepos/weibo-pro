import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { useEntityManager } from '@sker/entities';
import { queryUserPosts, queryUserNLPResults } from './user-profile.queries';
import {
  analyzeTimeBehavior,
  analyzeContentFeatures,
  analyzeInteractionFeatures,
  analyzeDeviceSources,
} from './user-profile.analysis';
import { detectAbnormalSignals } from './user-profile.signals';

/**
 * 分析用户的行为模式特征
 */
export const createAnalyzeUserBehaviorTool = () =>
  tool(
    async ({ userId, limit }) => {
      return useEntityManager(async (m) => {
        const { posts, userInfo } = await queryUserPosts(m, userId, limit);

        if (!userInfo) {
          return JSON.stringify({
            userId,
            message: '未找到该用户的帖子数据',
            behavior: null,
          });
        }

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
          timeBehavior: analyzeTimeBehavior(posts),
          contentFeatures: analyzeContentFeatures(posts),
          interactionFeatures: analyzeInteractionFeatures(posts),
          deviceSources: analyzeDeviceSources(posts),
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
        const { posts, userInfo } = await queryUserPosts(m, userId, limit);

        if (!userInfo) {
          return JSON.stringify({
            userId,
            isAbnormal: false,
            confidence: 0,
            message: '未找到该用户的帖子数据',
          });
        }

        // 获取该用户的NLP分析结果
        const nlpResults = await queryUserNLPResults(m, userId, limit);

        const abnormalSignals = detectAbnormalSignals(posts, nlpResults);

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
          low: 0.2, // 宽松
          medium: 0.35, // 中等
          high: 0.5, // 严格
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
