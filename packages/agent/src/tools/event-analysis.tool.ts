import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { EventStatisticsEntity, useEntityManager } from '@sker/entities';

/**
 * 查询事件的时间线演化数据
 */
export const createQueryEventTimelineTool = () =>
  tool(
    async ({ eventId, granularity }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(EventStatisticsEntity)
          .createQueryBuilder('stats')
          .where('stats.event_id = :eventId', { eventId })
          .andWhere('stats.granularity = :granularity', { granularity })
          .orderBy('stats.snapshot_at', 'ASC');

        const stats = await qb.getMany();

        return JSON.stringify({
          eventId,
          granularity,
          dataPoints: stats.length,
          timeline: stats.map((s) => ({
            time: s.snapshot_at,
            hotness: Number(s.hotness),
            sentiment: s.sentiment,
            postCount: s.post_count,
            userCount: s.user_count,
            interactions: {
              comments: s.comment_count,
              reposts: s.repost_count,
              likes: s.like_count,
              total: s.comment_count + s.repost_count + s.like_count,
            },
            trendMetrics: s.trend_metrics,
          })),
        });
      });
    },
    {
      name: 'query_event_timeline',
      description: `查询事件的时间线演化数据。
【核心】获取事件随时间变化的完整数据，包括热度、情感、互动量的变化趋势。
【粒度】支持小时、天、周、月级别的时间粒度。
【用途】分析事件的发展轨迹、识别爆发点、评估影响力变化。
这是理解事件"来龙去脉"的关键工具。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        granularity: z
          .enum(['hourly', 'daily', 'weekly', 'monthly'])
          .default('daily')
          .describe('时间粒度：hourly=小时, daily=天, weekly=周, monthly=月'),
      }),
    }
  );

/**
 * 分析事件的关键节点
 */
export const createAnalyzeEventMilestonesTool = () =>
  tool(
    async ({ eventId, granularity }) => {
      return useEntityManager(async (m) => {
        const stats = await m
          .getRepository(EventStatisticsEntity)
          .find({
            where: { event_id: eventId, granularity },
            order: { snapshot_at: 'ASC' },
          });

        if (stats.length < 2) {
          return JSON.stringify({
            eventId,
            milestones: [],
            message: '数据点不足，无法识别关键节点',
          });
        }

        const milestones: any[] = [];

        // 识别热度突增点（增长 > 50%）
        for (let i = 1; i < stats.length; i++) {
          const prev = stats[i - 1];
          const curr = stats[i];

          if (!prev || !curr) continue;

          const prevHotness = Number(prev.hotness);
          const currHotness = Number(curr.hotness);

          if (prevHotness > 0) {
            const growth = (currHotness - prevHotness) / prevHotness;
            if (growth > 0.5) {
              milestones.push({
                type: 'hotness_surge',
                time: curr.snapshot_at,
                description: `热度暴增 ${(growth * 100).toFixed(1)}%`,
                metrics: {
                  prevHotness: prevHotness,
                  currHotness: currHotness,
                  growth: growth,
                },
              });
            }
          }
        }

        // 识别情感转折点（正负情感占比反转）
        for (let i = 1; i < stats.length; i++) {
          const prev = stats[i - 1];
          const curr = stats[i];

          if (!prev || !curr || !prev.sentiment || !curr.sentiment) continue;

          const prevPositive = prev.sentiment.positive || 0;
          const prevNegative = prev.sentiment.negative || 0;
          const currPositive = curr.sentiment.positive || 0;
          const currNegative = curr.sentiment.negative || 0;

          if (prevPositive > prevNegative && currNegative > currPositive) {
            milestones.push({
              type: 'sentiment_reversal',
              time: curr.snapshot_at,
              description: '情感反转：正面转负面',
              metrics: {
                prevSentiment: { positive: prevPositive, negative: prevNegative },
                currSentiment: { positive: currPositive, negative: currNegative },
              },
            });
          }

          if (prevNegative > prevPositive && currPositive > currNegative) {
            milestones.push({
              type: 'sentiment_reversal',
              time: curr.snapshot_at,
              description: '情感反转：负面转正面',
              metrics: {
                prevSentiment: { positive: prevPositive, negative: prevNegative },
                currSentiment: { positive: currPositive, negative: currNegative },
              },
            });
          }
        }

        // 识别病毒式传播点（转发量激增 > 100%）
        for (let i = 1; i < stats.length; i++) {
          const prev = stats[i - 1];
          const curr = stats[i];

          if (!prev || !curr) continue;

          if (prev.repost_count > 0) {
            const growth = (curr.repost_count - prev.repost_count) / prev.repost_count;
            if (growth > 1.0) {
              milestones.push({
                type: 'viral_spread',
                time: curr.snapshot_at,
                description: `转发量激增 ${(growth * 100).toFixed(0)}%`,
                metrics: {
                  prevReposts: prev.repost_count,
                  currReposts: curr.repost_count,
                  growth: growth,
                },
              });
            }
          }
        }

        // 识别峰值点
        const maxHotness = Math.max(...stats.map((s) => Number(s.hotness)));
        const peakStat = stats.find((s) => Number(s.hotness) === maxHotness);
        if (peakStat) {
          milestones.push({
            type: 'peak',
            time: peakStat.snapshot_at,
            description: `事件热度峰值 (${maxHotness.toFixed(2)})`,
            metrics: {
              hotness: maxHotness,
              postCount: peakStat.post_count,
              interactions:
                peakStat.comment_count +
                peakStat.repost_count +
                peakStat.like_count,
            },
          });
        }

        milestones.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );

        return JSON.stringify({
          eventId,
          totalMilestones: milestones.length,
          milestones,
        });
      });
    },
    {
      name: 'analyze_event_milestones',
      description: `自动识别事件的关键节点。
【功能】智能分析事件统计数据，自动识别：
  - 热度突增点（hotness_surge）：热度暴增 > 50%
  - 情感转折点（sentiment_reversal）：正负情感反转
  - 病毒传播点（viral_spread）：转发量激增 > 100%
  - 峰值点（peak）：事件最高热度时刻
【用途】快速定位事件发展的关键转折点，是分析"关键节点"的核心工具。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        granularity: z
          .enum(['hourly', 'daily', 'weekly', 'monthly'])
          .default('daily')
          .describe('分析时间粒度，建议使用 daily'),
      }),
    }
  );
