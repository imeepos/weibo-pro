import React from "react";
import { useWordCloudData, useEventCountSeries, usePostCountSeries } from "@/hooks/useChartData";
import { useOverviewData } from "@/hooks/useOverviewData";

// Charts 组件
import StatsOverview from "../ui/StatsOverview";
import SentimentTrendChart from "../charts/SentimentTrendChart";
import WordCloudChart from "../charts/WordCloudChart";
import GeographicChart from "../charts/GeographicChart";
import HotEventsList from "../charts/HotEventsList";
import SimpleSentimentPieChart from "../charts/SimpleSentimentPieChart";
import EmotionCurveChart from "../charts/EmotionCurveChart";
import EventTypeBarChart from "../charts/EventTypeBarChart";
import MiniTrendChart from "../charts/MiniTrendChart";
import AgeDistributionChart from "../charts/AgeDistributionChart";
import EventCountChart from "../charts/EventCountChart";
import EventDevelopmentChart from "../charts/EventDevelopmentChart";
import EventTimelineChart from "../charts/EventTimelineChart";
import EventTypePieChart from "../charts/EventTypePieChart";
import GenderDistributionChart from "../charts/GenderDistributionChart";
import HotTopicsChart from "../charts/HotTopicsChart";
import InfluenceNetworkFlow from "../charts/InfluenceNetworkFlow";
import PostCountChart from "../charts/PostCountChart";
import PropagationPathChart from "../charts/PropagationPathChart";
import SentimentPieChart from "../charts/SentimentPieChart";
import SimpleNetworkFlow from "../charts/SimpleNetworkFlow";
import TimeSeriesChart from "../charts/TimeSeriesChart";

// UI 组件
import FullscreenIndicator from "../ui/FullscreenIndicator";
import { Spinner } from "@sker/ui/components/ui/spinner";
import NavigationMenu from "../ui/NavigationMenu";
import SentimentOverview from "../ui/SentimentOverview";

// 词云数据提供者组件（用于在工厂函数中使用 hooks）
export const WordCloudProvider: React.FC<{ children: React.ReactNode; maxWords?: number }> = ({
  children,
  maxWords = 100
}) => {
  const { data: wordCloudData } = useWordCloudData(maxWords);

  // 使用 React.cloneElement 传递数据给子组件
  const child = children as React.ReactElement<any>;
  return React.cloneElement(child, {
    ...child.props,
    data: wordCloudData
  });
};

// 数据提供者：KPI 统计（真实数据 + 真实事件/帖子趋势 sparkline）
export const StatsOverviewProvider: React.FC<{ className?: string }> = ({ className }) => {
  const { statsOverviewData, loading } = useOverviewData();
  const eventSeries = useEventCountSeries(7);
  const postSeries = usePostCountSeries(7);
  const trendData = {
    event: eventSeries.data?.map((p) => p.value) ?? [],
    post: postSeries.data?.map((p) => p.value) ?? [],
  };
  return (
    <StatsOverview
      data={statsOverviewData}
      loading={loading}
      trendData={trendData}
      className={className}
    />
  );
};

// 数据提供者：情感概览（真实数据）
const SentimentOverviewProvider: React.FC<{ className?: string }> = ({ className }) => {
  const { sentimentData, loading } = useOverviewData();
  const data = sentimentData
    ? {
        positive: sentimentData.positive,
        negative: sentimentData.negative,
        neutral: sentimentData.neutral,
      }
    : null;
  return <SentimentOverview data={data} loading={loading} className={className} />;
};

// 数据提供者：事件数量趋势（真实数据，用于用户行为图）
const MiniTrendProvider: React.FC = () => {
  const { data } = useEventCountSeries(7);
  const trend = data?.map((p) => p.value) ?? [];
  return <MiniTrendChart data={trend} color="#8b5cf6" type="line" />;
};

// 组件包装器 - 为每个组件提供适当的数据和配置
export const componentWrappers = {
  // 情感趋势图
  "sentiment-trend-chart": () => {
    return <SentimentTrendChart className="w-full h-full flex-1" />;
  },

  // 情感分布饼图
  "sentiment-pie-chart": () => {
    return <SimpleSentimentPieChart className="w-full h-full flex-1" />;
  },

  // 词云图
  "word-cloud": () => {
    return (
      <WordCloudProvider maxWords={1000}>
        <WordCloudChart className="w-full h-full flex-1" />
      </WordCloudProvider>
    );
  },

  // 事件时间线（使用热点事件列表）
  "event-timeline": () => {
    return <HotEventsList className="w-full h-full flex-1" />;
  },

  // 热点事件列表
  "hot-events-list": () => {
    return <HotEventsList className="w-full h-full flex-1" />;
  },

  // 用户行为图表（真实事件序列）
  "user-behavior-chart": () => {
    return <MiniTrendProvider />;
  },

  // 活动热力图（使用事件类型柱状图）
  "activity-heatmap": () => {
    return <EventTypeBarChart className="w-full h-full flex-1" />;
  },

  // KPI指标（真实统计）
  "kpi-metrics": () => {
    return <StatsOverviewProvider className="w-full h-full flex-1" />;
  },

  // 数据表格（使用热点事件列表代替）
  "data-table": () => {
    return <HotEventsList className="w-full h-full flex-1" />;
  },

  // 情感曲线图
  "emotion-curve": () => {
    return <EmotionCurveChart className="w-full h-full flex-1" />;
  },

  // 地理分布图（另一个版本）
  "geographic-chart": () => {
    return <GeographicChart className="w-full h-full flex-1" />;
  },

  // 新增组件包装器
  // 年龄分布图
  "age-distribution-chart": () => {
    return <AgeDistributionChart className="w-full h-full flex-1" />;
  },

  // 事件数量图
  "event-count-chart": () => {
    return <EventCountChart className="w-full h-full flex-1" />;
  },

  // 事件发展图
  "event-development-chart": () => {
    return <EventDevelopmentChart className="w-full h-full flex-1" phases={[]} />;
  },

  // 事件时间轴图
  "event-timeline-chart": () => {
    return <EventTimelineChart className="w-full h-full flex-1" data={[]} />;
  },

  // 事件类型饼图
  "event-type-pie-chart": () => {
    return <EventTypePieChart className="w-full h-full flex-1" />;
  },

  // 性别分布图
  "gender-distribution-chart": () => {
    return <GenderDistributionChart className="w-full h-full flex-1" />;
  },

  // 热门话题图
  "hot-topics-chart": () => {
    return <HotTopicsChart className="w-full h-full flex-1" data={[]} />;
  },

  // 影响力网络流
  "influence-network-flow": () => {
    return <InfluenceNetworkFlow className="w-full h-full flex-1" users={[]} />;
  },

  // 帖子数量图
  "post-count-chart": () => {
    return <PostCountChart className="w-full h-full flex-1" />;
  },

  // 传播路径图
  "propagation-path-chart": () => {
    return <PropagationPathChart className="w-full h-full flex-1" data={[]} />;
  },

  // 情感饼图
  "sentiment-pie-chart-full": () => {
    return <SentimentPieChart className="w-full h-full flex-1" />;
  },

  // 简单网络流
  "simple-network-flow": () => {
    return <SimpleNetworkFlow className="w-full h-full flex-1" users={[]} />;
  },


  // 时间序列图
  "time-series-chart": () => {
    return <TimeSeriesChart data={[]} className="w-full h-full flex-1" />;
  },

  // 添加直接的组件名称映射（用于向后兼容）
  "StatsOverview": () => {
    return <StatsOverviewProvider className="w-full h-full flex-1" />;
  },

  "SentimentTrendChart": () => {
    return <SentimentTrendChart className="w-full h-full flex-1" />;
  },

  "WordCloudChart": () => {
    return (
      <WordCloudProvider maxWords={1000}>
        <WordCloudChart className="w-full h-full flex-1" />
      </WordCloudProvider>
    );
  },

  "GeographicChart": () => {
    return <GeographicChart className="w-full h-full flex-1" />;
  },

  "HotEventsList": () => {
    return <HotEventsList className="w-full h-full flex-1" />;
  },

  // UI 组件包装器

  // 全屏指示器
  "fullscreen-indicator": () => {
    return <FullscreenIndicator className="w-full h-full flex-1" />;
  },

  // 加载旋转器
  "loading-spinner": () => {
    return <Spinner className="w-full h-full flex-1" />;
  },

  // 导航菜单
  "navigation-menu": () => {
    return <NavigationMenu className="w-full h-full flex-1" />;
  },

  // 情感概览（真实数据）
  "sentiment-overview": () => {
    return <SentimentOverviewProvider className="w-full h-full flex-1" />;
  },
};
