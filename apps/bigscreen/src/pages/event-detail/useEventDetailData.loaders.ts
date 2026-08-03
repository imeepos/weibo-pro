import { root } from '@sker/core';
import {
  EventsController,
  PropagationVelocityController,
  InfluencePredictionController,
  CommunityEvolutionController,
  UserStratificationController,
  PostingTimeController,
  CommentDepthController,
} from '@sker/sdk';
import type { UserRelationNetwork } from '@sker/sdk';
import type { TabId } from '@/types/tab-loading';
import type { GeographicDataPoint } from './types';

export interface TabLoadContext {
  eventId: string;
  userRelationNetwork: UserRelationNetwork | null;
  geographicData: GeographicDataPoint[];
  propagationVelocityData: any;
  influencePredictionData: any;
  communityEvolutionData: any;
  userStratificationData: any;
  postingTimeData: any;
  commentDepthData: any;
  setUserRelationNetwork: (data: UserRelationNetwork | null) => void;
  setGeographicData: (data: GeographicDataPoint[]) => void;
  setGeographicStats: (stats: { totalPosts?: number; totalUsers?: number; totalRegions?: number }) => void;
  setPropagationVelocityData: (data: any) => void;
  setInfluencePredictionData: (data: any) => void;
  setCommunityEvolutionData: (data: any) => void;
  setUserStratificationData: (data: any) => void;
  setPostingTimeData: (data: any) => void;
  setCommentDepthData: (data: any) => void;
  loadTrendWidgets: () => Promise<void>;
  loadOpinionWidgets: () => Promise<void>;
  loadUserAnalysisWidgets: () => Promise<void>;
  loadSentimentWidgets: () => Promise<void>;
}

export async function loadDataForTab(tabId: TabId, ctx: TabLoadContext): Promise<void> {
  const c = root.get(EventsController);

  switch (tabId) {
    case 'overview':
      // overview 已在 fetchEventData 中加载
      break;

    case 'network':
      // 加载关系网络数据
      if (!ctx.userRelationNetwork) {
        const data = await c.getEventUserRelations(ctx.eventId);
        ctx.setUserRelationNetwork(data);
      }
      break;

    case 'geographic':
      // 加载地理分布数据
      if (!ctx.geographicData.length) {
        const data = await c.getEventGeographic(ctx.eventId);

        // 保存后端附加的统计数据
        ctx.setGeographicStats({
          totalPosts: data.statistics.postCount,
          totalUsers: data.statistics.userCount,
          totalRegions: data.statistics.regionCount,
        });
        ctx.setGeographicData(data.distributions.map((item: any) => ({
          region: item.region,
          count: item.count,
          percentage: item.percentage,
          posts: item.posts,
          sentiment: item.sentiment
        })));
      }
      break;

    case 'trend':
      await ctx.loadTrendWidgets();
      break;

    case 'opinions':
      await ctx.loadOpinionWidgets();
      break;

    case 'sentiment':
      await ctx.loadSentimentWidgets();
      break;

    case 'advanced':
      // 加载高级分析数据
      await Promise.all([
        (async () => {
          if (!ctx.propagationVelocityData) {
            const controller = root.get(PropagationVelocityController);
            const data = await controller.getVelocity(ctx.eventId);
            ctx.setPropagationVelocityData(data);
          }
        })(),
        (async () => {
          if (!ctx.influencePredictionData) {
            const controller = root.get(InfluencePredictionController);
            const data = await controller.getInfluencePrediction(ctx.eventId);
            ctx.setInfluencePredictionData(data);
          }
        })(),
        (async () => {
          if (!ctx.communityEvolutionData) {
            const controller = root.get(CommunityEvolutionController);
            const data = await controller.getAnalysis(ctx.eventId);
            ctx.setCommunityEvolutionData(data);
          }
        })(),
      ]);
      break;

    case 'user-analysis':
      // 加载用户分析数据
      await Promise.all([
        ctx.loadUserAnalysisWidgets(),
        (async () => {
          if (!ctx.userStratificationData) {
            const controller = root.get(UserStratificationController);
            const data = await controller.getStratification(ctx.eventId);
            ctx.setUserStratificationData(data);
          }
        })(),
      ]);
      break;

    case 'content-analysis':
      // 加载内容分析数据
      await Promise.all([
        (async () => {
          if (!ctx.postingTimeData) {
            const controller = root.get(PostingTimeController);
            const data = await controller.getHeatmap(ctx.eventId);
            ctx.setPostingTimeData(data);
          }
        })(),
        (async () => {
          if (!ctx.commentDepthData) {
            const controller = root.get(CommentDepthController);
            const data = await controller.getAnalysis(ctx.eventId);
            ctx.setCommentDepthData(data);
          }
        })(),
      ]);
      break;
  }
}
