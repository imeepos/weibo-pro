import React from 'react';
import { Activity, MessageSquare, Users, Zap } from 'lucide-react';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import type { EventStats, TrendSeries } from './types';

export interface StatsOverviewProps {
  stats: EventStats;
  trendSeries: TrendSeries;
}

/** 统计概览 - 2x2 网格 */
export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, trendSeries }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="事件总数"
        value={stats.totalEvents}
        change={stats.eventChange}
        icon={Activity}
        color="blue"
        chartComponent={<MiniTrendChart data={trendSeries.events} color="#3b82f6" type="line" />}
        className="group hover:border-primary/30 transition-all duration-300"
      />
      <MetricCard
        title="贴子总数"
        value={stats.totalPosts}
        change={stats.postChange}
        icon={MessageSquare}
        color="green"
        chartComponent={<MiniTrendChart data={trendSeries.posts} color="#10b981" type="line" />}
        className="group hover:border-primary/30 transition-all duration-300"
      />
      <MetricCard
        title="参与用户"
        value={stats.totalUsers}
        change={stats.userChange}
        icon={Users}
        color="purple"
        chartComponent={<MiniTrendChart data={trendSeries.users} color="#8b5cf6" type="line" />}
        className="group hover:border-primary/30 transition-all duration-300"
      />
      <MetricCard
        title="平均热度"
        value={stats.avgHotness}
        change={stats.hotnessChange}
        icon={Zap}
        color="red"
        chartComponent={<MiniTrendChart data={trendSeries.hotness} color="#ef4444" type="bar" />}
        className="group hover:border-primary/30 transition-all duration-300"
      />
    </div>
  );
};
