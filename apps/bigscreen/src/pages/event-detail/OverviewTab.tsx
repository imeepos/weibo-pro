import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  Heart,
  MessageCircle,
  MessageSquare,
  PieChart,
  Share2,
  Sprout,
  ThumbsUp,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import { AnalysisWidgetCard } from '@/components/ui';
import HotTopicsChart from '@/components/charts/HotTopicsChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import WordCloudChart from '@/components/charts/WordCloudChart';
import EngagementTrendChart from '@/components/charts/EngagementTrendChart';
import { EventMilestoneWidget } from '@/components/charts/EventMilestoneWidget';
import { InstitutionParticipationPanel } from '@/components/charts/InstitutionParticipationPanel';
import type { EventDetailData } from './types';
import type { OverviewWidgets } from './types';
import type { EngagementStats, EngagementTrendItem, KeywordItem, TrendStats } from './utils';
import type { TimeSeriesDataPoint } from './types';

interface OverviewTabProps {
  eventData: EventDetailData;
  stats: TrendStats | null;
  engagementStats: EngagementStats | null;
  engagementTrendData: EngagementTrendItem[];
  timeSeriesData: TimeSeriesDataPoint[];
  keywordData: KeywordItem[];
  overviewWidgets: OverviewWidgets;
  loadOverviewPhase2Widgets: () => void;
}

export function OverviewTab({
  eventData,
  stats,
  engagementStats,
  engagementTrendData,
  timeSeriesData,
  keywordData,
  overviewWidgets,
  loadOverviewPhase2Widgets,
}: OverviewTabProps) {
  return (
    <TabsContent value="overview" className="mt-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* 核心指标 - 4列网格 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="贴子总数"
            value={stats?.totalPosts ?? eventData.postCount ?? 0}
            icon={MessageSquare}
            color="blue"
            className="group hover:border-primary/30 transition-all duration-300"
          />
          <MetricCard
            title="参与用户"
            value={stats?.totalUsers ?? eventData.userCount ?? 0}
            icon={Users}
            color="green"
            className="group hover:border-primary/30 transition-all duration-300"
          />
          <MetricCard
            title="平均热度"
            value={stats?.avgHotness ?? Number(eventData.hotness)}
            icon={Zap}
            color="red"
            className="group hover:border-primary/30 transition-all duration-300"
          />
          <MetricCard
            title="情感得分"
            value={stats?.avgSentiment ?? (eventData.sentiment?.positive ?? 0) * 100}
            suffix="%"
            icon={Heart}
            color="purple"
            className="group hover:border-primary/30 transition-all duration-300"
          />
        </div>

        {/* 互动指标 - 4列网格 */}
        {engagementStats && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              互动指标
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="评论总数"
                value={engagementStats.totalComments}
                icon={MessageCircle}
                color="blue"
                className="group hover:border-primary/30 transition-all duration-300"
              />
              <MetricCard
                title="点赞总数"
                value={engagementStats.totalLikes}
                icon={ThumbsUp}
                color="red"
                className="group hover:border-primary/30 transition-all duration-300"
              />
              <MetricCard
                title="转发总数"
                value={engagementStats.totalReposts}
                icon={Share2}
                color="green"
                className="group hover:border-primary/30 transition-all duration-300"
              />
              <MetricCard
                title="互动总量"
                value={engagementStats.totalEngagement}
                icon={Activity}
                color="yellow"
                className="group hover:border-primary/30 transition-all duration-300"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalysisWidgetCard
            title="事件里程碑"
            icon={<Clock className="h-4 w-4" />}
            state={overviewWidgets.milestones}
            emptyText="暂无里程碑数据"
            onRetry={loadOverviewPhase2Widgets}
          >
            <EventMilestoneWidget data={overviewWidgets.milestones.data ?? []} />
          </AnalysisWidgetCard>

          <AnalysisWidgetCard
            title="高频话题分布"
            icon={<Sprout className="h-4 w-4" />}
            state={overviewWidgets.topicOverview}
            emptyText="暂无话题分布数据"
            onRetry={loadOverviewPhase2Widgets}
          >
            <HotTopicsChart
              title=""
              data={(overviewWidgets.topicOverview.data?.topTopics ?? []).map((item, index) => ({
                id: `${item.title}-${index}`,
                createdAt: '',
                updatedAt: '',
                title: item.title,
                count: item.count,
                sentiment: item.sentiment as 'positive' | 'negative' | 'neutral',
                keywords: [],
                trend: item.trend,
                trendValue: 0,
              }))}
              maxTopics={8}
            />
          </AnalysisWidgetCard>
        </div>

        <AnalysisWidgetCard
          title="机构账号参与"
          icon={<Users className="h-4 w-4" />}
          state={overviewWidgets.institutions}
          emptyText="暂无机构参与数据"
          onRetry={loadOverviewPhase2Widgets}
        >
          <InstitutionParticipationPanel data={overviewWidgets.institutions.data ?? []} />
        </AnalysisWidgetCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 情感趋势 */}
          <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              情感变化趋势
            </h3>
            <TimeSeriesChart data={timeSeriesData} title="" height={280} />
          </div>
          {/* 关键词云 */}
          <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Sprout className="w-4 h-4" />
              事件关键词云
            </h3>
            <WordCloudChart title="" height={280} maxWords={1000} data={keywordData} />
          </div>
        </div>
        {/* 互动指标分解 */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            互动指标趋势
          </h3>
          <EngagementTrendChart data={engagementTrendData} height={280} />
        </div>
      </motion.div>
    </TabsContent>
  );
}
