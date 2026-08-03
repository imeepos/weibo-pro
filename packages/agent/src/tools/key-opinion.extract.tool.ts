import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  PostNLPResultEntity,
  EventHourlyStatisticsEntity,
  useEntityManager,
} from '@sker/entities';

/**
 * 提取事件关键时间点的代表性言论
 */
export const createExtractKeyOpinionsTool = () =>
  tool(
    async ({ eventId, topN }) => {
      return useEntityManager(async (m) => {
        // 先获取关键时间点（从小时级统计表）
        const stats = await m
          .getRepository(EventHourlyStatisticsEntity)
          .find({
            where: { event_id: eventId },
            order: { year: 'ASC', month: 'ASC', day: 'ASC', hour: 'ASC' },
          });

        if (stats.length < 2) {
          return JSON.stringify({
            eventId,
            keyOpinions: [],
            message: '数据点不足，无法识别关键节点言论',
          });
        }

        const milestones: Array<{
          type: string;
          time: Date;
          description: string;
        }> = [];

        // 识别热度突增点
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
                time: new Date(curr.year, curr.month - 1, curr.day, curr.hour),
                description: `热度暴增 ${(growth * 100).toFixed(1)}%`,
              });
            }
          }
        }

        // 识别情感转折点
        for (let i = 1; i < stats.length; i++) {
          const prev = stats[i - 1];
          const curr = stats[i];
          if (!prev || !curr) continue;

          const prevPositive = Number(prev.sentiment_positive);
          const prevNegative = Number(prev.sentiment_negative);
          const currPositive = Number(curr.sentiment_positive);
          const currNegative = Number(curr.sentiment_negative);

          if (prevPositive > prevNegative && currNegative > currPositive) {
            milestones.push({
              type: 'sentiment_reversal',
              time: new Date(curr.year, curr.month - 1, curr.day, curr.hour),
              description: '情感反转：正面转负面',
            });
          }

          if (prevNegative > prevPositive && currPositive > currNegative) {
            milestones.push({
              type: 'sentiment_reversal',
              time: new Date(curr.year, curr.month - 1, curr.day, curr.hour),
              description: '情感反转：负面转正面',
            });
          }
        }

        // 识别峰值点
        const maxHotness = Math.max(...stats.map((s) => Number(s.hotness)));
        const peakStat = stats.find((s) => Number(s.hotness) === maxHotness);
        if (peakStat) {
          milestones.push({
            type: 'peak',
            time: new Date(peakStat.year, peakStat.month - 1, peakStat.day, peakStat.hour),
            description: `事件热度峰值`,
          });
        }

        milestones.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );

        // 为每个关键时间点提取代表性言论
        const keyOpinions = await Promise.all(
          milestones.map(async (milestone) => {
            const timeWindowStart = new Date(milestone.time);
            const timeWindowEnd = new Date(milestone.time);

            // 使用小时级时间窗口（前后各1小时）
            timeWindowStart.setHours(timeWindowStart.getHours() - 1);
            timeWindowEnd.setHours(timeWindowEnd.getHours() + 1);

            const results = await m
              .getRepository(PostNLPResultEntity)
              .createQueryBuilder('nlp')
              .leftJoin('nlp.post', 'post')
              .leftJoin('weibo_users', 'u', 'u.id = post.user_id')
              .select('nlp.*')
              .addSelect('post.*')
              .addSelect('u.id', 'user_id')
              .addSelect('u.screen_name', 'user_screen_name')
              .addSelect('u.verified', 'user_verified')
              .addSelect('u.status_total_counter', 'user_status_total_counter')
              .where('nlp.event_id = :eventId', { eventId })
              .andWhere('post.created_at >= :startTime', {
                startTime: timeWindowStart.toISOString(),
              })
              .andWhere('post.created_at <= :endTime', {
                endTime: timeWindowEnd.toISOString(),
              })
              .orderBy(
                '(post.reposts_count + post.comments_count + post.attitudes_count)',
                'DESC'
              )
              .limit(topN)
              .getRawMany();

            return {
              milestone: {
                type: milestone.type,
                time: milestone.time,
                description: milestone.description,
              },
              opinions: results.map((r) => ({
                postId: r.post_id,
                text: r.post_text,
                createdAt: r.post_created_at,
                user: {
                  userId: r.user_id,
                  userName: r.user_screen_name || '未知用户',
                  verified: r.user_verified || false,
                  followersCount: r.user_status_total_counter?.total_cnt || '0',
                },
                interactions: {
                  reposts: r.post_reposts_count || 0,
                  comments: r.post_comments_count || 0,
                  likes: r.post_attitudes_count || 0,
                  total:
                    (r.post_reposts_count || 0) +
                    (r.post_comments_count || 0) +
                    (r.post_attitudes_count || 0),
                },
                nlp: {
                  sentiment: r.nlp_sentiment?.overall || 'neutral',
                  keywords: (r.nlp_keywords || []).slice(0, 5),
                },
              })),
            };
          })
        );

        return JSON.stringify({
          eventId,
          totalMilestones: milestones.length,
          keyOpinions: keyOpinions.filter((ko) => ko.opinions.length > 0),
        });
      });
    },
    {
      name: 'extract_key_opinions',
      description: `提取事件关键时间点的代表性言论。
【核心】自动识别关键转折点，并提取每个时间点最具代表性的言论。
【工作流程】：
  1. 识别关键时间点（热度突增、情感反转、峰值）
  2. 为每个时间点提取高互动量的代表性帖子
  3. 关联发言者信息（包括影响力指标）
【数据】返回：
  - 关键时间点信息（类型、时间、描述）
  - 该时间点的代表性言论（Top N）
  - 发言者信息（用户名、认证、粉丝数）
  - 互动数据和NLP分析
【用途】快速定位"在什么时间，谁说了什么关键的话"，是分析事件演变的核心工具。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        topN: z
          .number()
          .default(5)
          .describe('每个时间点提取的代表性言论数量，默认 5'),
      }),
    }
  );
