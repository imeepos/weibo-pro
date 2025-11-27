import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageCircle, Users, ThumbsUp } from 'lucide-react';
import MetricCard from './MetricCard';
import MiniTrendChart from '@/components/charts/MiniTrendChart';

interface StatsData {
  events: { value: number; change: number };
  posts: { value: number; change: number };
  users: { value: number; change: number };
  interactions: { value: number; change: number };
}

interface StatsOverviewProps {
  data: StatsData | null;
  loading?: boolean;
  className?: string;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  data,
  loading = false,
  className = ''
}) => {
  // 数据为空时的默认值
  const defaultData: StatsData = {
    events: { value: 0, change: 0 },
    posts: { value: 0, change: 0 },
    users: { value: 0, change: 0 },
    interactions: { value: 0, change: 0 }
  };

  const statsData = data || defaultData;
  const formatValue = (value: number): number => {
    if (value >= 1000) {
      return Math.round(value / 100) / 10; // 转换为 K 单位，保留一位小数
    }
    return value;
  };

  // 使用静态趋势数据
  const trendData = useMemo(() => ({
    eventTrendData: [120, 145, 180, 165, 190, 175, 200],
    postTrendData: [1200, 1450, 1800, 1650, 1900, 1750, 2000],
    userTrendData: [680, 720, 850, 780, 920, 860, 950],
    interactionTrendData: [3200, 3800, 4500, 4200, 4800, 4600, 5000]
  }), []);

  const { eventTrendData, postTrendData, userTrendData, interactionTrendData } = trendData;


  return (
    <div className={`grid grid-cols-2 gap-2 w-full ${className}`}>
      <MetricCard
        title="事件数"
        value={formatValue(statsData.events.value)}
        change={statsData.events.change}
        icon={FileText}
        color="blue"
        loading={loading}
        chartComponent={<MiniTrendChart data={eventTrendData} color="#3b82f6" type="line" height={20} />}
        className="relative"
      />

      <MetricCard
        title="贴子数"
        value={formatValue(statsData.posts.value)}
        change={statsData.posts.change}
        icon={MessageCircle}
        color="green"
        loading={loading}
        chartComponent={<MiniTrendChart data={postTrendData} color="#10b981" type="line" height={20} />}
        className="relative"
      />

      <MetricCard
        title="用户数量"
        value={statsData.users.value}
        change={statsData.users.change}
        icon={Users}
        color="purple"
        loading={loading}
        chartComponent={<MiniTrendChart data={userTrendData} color="#8b5cf6" type="line" height={20} />}
        className="relative"
      />

      <MetricCard
        title="互动数"
        value={formatValue(statsData.interactions.value)}
        change={statsData.interactions.change}
        icon={ThumbsUp}
        color="red"
        loading={loading}
        chartComponent={<MiniTrendChart data={interactionTrendData} color="#ef4444" type="line" height={20} />}
        className="relative"
      />
    </div>
  );
};

export default StatsOverview;