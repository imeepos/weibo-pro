import React from 'react';
import { FileText, MessageCircle, Users, ThumbsUp } from 'lucide-react';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import MiniTrendChart from '@/components/charts/MiniTrendChart';

interface StatsData {
  events: { value: number; change: number };
  posts: { value: number; change: number };
  users: { value: number; change: number };
  interactions: { value: number; change: number };
}

// 真实趋势数据（仅事件/帖子有真实序列 API；用户/互动无序列则无 sparkline）
interface StatsTrendData {
  event?: number[];
  post?: number[];
}

interface StatsOverviewProps {
  data: StatsData | null;
  loading?: boolean;
  className?: string;
  trendData?: StatsTrendData;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  data,
  loading = false,
  className = '',
  trendData
}) => {
  // 数据为空时的默认值
  const defaultData: StatsData = {
    events: { value: 0, change: 0 },
    posts: { value: 0, change: 0 },
    users: { value: 0, change: 0 },
    interactions: { value: 0, change: 0 }
  };

  const statsData = data || defaultData;

  // 格式化数值：保持原值，通过 CountUp 的 suffix 添加单位
  const formatMetric = (value: number) => {
    if (value >= 10000) {
      return {
        value: Math.round(value / 100) / 10,
        suffix: 'K'
      };
    }
    return {
      value,
      suffix: ''
    };
  };

  const eventsMetric = formatMetric(statsData.events.value);
  const postsMetric = formatMetric(statsData.posts.value);
  const interactionsMetric = formatMetric(statsData.interactions.value);

  // 只渲染真实趋势数据；用户/互动无真实序列 API，不渲染 sparkline
  const { event: eventTrendData = [], post: postTrendData = [] } = trendData ?? {};


  return (
    <div className={`grid grid-cols-2 gap-2 w-full ${className}`}>
      <MetricCard
        title="事件数"
        value={eventsMetric.value}
        change={statsData.events.change}
        icon={FileText}
        color="blue"
        loading={loading}
        suffix={eventsMetric.suffix}
        chartComponent={eventTrendData.length > 0 ? <MiniTrendChart data={eventTrendData} color="#3b82f6" type="line" height={20} /> : undefined}
        className="relative"
      />

      <MetricCard
        title="贴子数"
        value={postsMetric.value}
        change={statsData.posts.change}
        icon={MessageCircle}
        color="green"
        loading={loading}
        suffix={postsMetric.suffix}
        chartComponent={postTrendData.length > 0 ? <MiniTrendChart data={postTrendData} color="#10b981" type="line" height={20} /> : undefined}
        className="relative"
      />

      <MetricCard
        title="用户数量"
        value={statsData.users.value}
        change={statsData.users.change}
        icon={Users}
        color="purple"
        loading={loading}
        className="relative"
      />

      <MetricCard
        title="互动数"
        value={interactionsMetric.value}
        change={statsData.interactions.change}
        icon={ThumbsUp}
        color="red"
        loading={loading}
        suffix={interactionsMetric.suffix}
        className="relative"
      />
    </div>
  );
};

export default StatsOverview;