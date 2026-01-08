import React from "react";
import { KeywordData } from "@/types";
import { TrendingUp } from "lucide-react";
import { useWordCloudData } from "@/hooks/useChartData";

// 导入所有可用的真实组件
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
import LocationHeatMap from "../charts/LocationHeatMap";
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
import { CountUp } from "@sker/ui/components/ui/count-up";
import FullscreenIndicator from "../ui/FullscreenIndicator";
import {Spinner} from "@sker/ui/components/ui/spinner";
import { MetricCard } from "@sker/ui/components/ui/metric-card";
import NavigationMenu from "../ui/NavigationMenu";
import SentimentOverview from "../ui/SentimentOverview";

// 模拟数据生成器
const generateComponentData = (timeRange?: string) => {
  // 根据时间范围生成不同的统计数据
  const baseStats = {
    today: { events: 1234, posts: 15680, users: 8945, interactions: 45230 },
    yesterday: { events: 1156, posts: 14520, users: 8654, interactions: 42150 },
    thisWeek: { events: 8642, posts: 109760, users: 62615, interactions: 317610 },
    lastWeek: { events: 7980, posts: 101440, users: 57765, interactions: 293025 },
    thisMonth: { events: 36540, posts: 463680, users: 264465, interactions: 1342230 },
    lastMonth: { events: 33210, posts: 421680, users: 240435, interactions: 1220415 },
    thisQuarter: { events: 125430, posts: 1592640, users: 908115, interactions: 4609845 },
    thisYear: { events: 456780, posts: 5801280, users: 3307965, interactions: 16784310 },
    all: { events: 823406, posts: 10460876, users: 5966646, interactions: 30271758 },
  };

  const data = baseStats[timeRange as keyof typeof baseStats] || baseStats.today;

  // 统计数据
  const statsData = {
    events: { value: data.events, change: (Math.random() - 0.5) * 40 },
    posts: { value: data.posts, change: (Math.random() - 0.5) * 30 },
    users: { value: data.users, change: (Math.random() - 0.5) * 20 },
    interactions: { value: data.interactions, change: (Math.random() - 0.5) * 50 },
  };

  // 生成时间相关的词云数据倍数
  const multipliers = {
    today: 1,
    yesterday: 0.95,
    thisWeek: 7.2,
    lastWeek: 6.8,
    thisMonth: 31,
    lastMonth: 29,
    thisQuarter: 92,
    lastQuarter: 87,
    halfYear: 183,
    lastHalfYear: 178,
    thisYear: 370,
    lastYear: 355,
    all: 730,
  };

  const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;

  // 词云数据
  const baseWords: KeywordData[] = [
    { name: "新能源", value: 856, sentiment: "positive" },
    { name: "科技创新", value: 734, sentiment: "positive" },
    { name: "环保政策", value: 678, sentiment: "neutral" },
    { name: "经济发展", value: 623, sentiment: "positive" },
    { name: "教育改革", value: 567, sentiment: "neutral" },
    { name: "医疗保障", value: 534, sentiment: "positive" },
    { name: "就业机会", value: 498, sentiment: "positive" },
    { name: "房价上涨", value: 465, sentiment: "negative" },
    { name: "交通拥堵", value: 432, sentiment: "negative" },
    { name: "食品安全", value: 398, sentiment: "neutral" },
    { name: "网络安全", value: 365, sentiment: "neutral" },
    { name: "数字化转型", value: 334, sentiment: "positive" },
    { name: "绿色出行", value: 298, sentiment: "positive" },
    { name: "智能制造", value: 276, sentiment: "positive" },
    { name: "乡村振兴", value: 245, sentiment: "positive" },
  ];

  const wordCloudData: KeywordData[] = baseWords.map(word => ({
    ...word,
    value: Math.floor(word.value * multiplier * (0.85 + Math.random() * 0.3))
  }));

  // 地理位置数据
  const baseLocations = [
    {
      name: "北京",
      coordinates: [116.4074, 39.9042] as [number, number],
      value: 1234,
      sentiment: "positive" as const,
    },
    {
      name: "上海",
      coordinates: [121.4737, 31.2304] as [number, number],
      value: 987,
      sentiment: "positive" as const,
    },
    {
      name: "广州",
      coordinates: [113.2644, 23.1291] as [number, number],
      value: 856,
      sentiment: "neutral" as const,
    },
    {
      name: "深圳",
      coordinates: [114.0579, 22.5431] as [number, number],
      value: 743,
      sentiment: "positive" as const,
    },
  ];

  const locationData = baseLocations.map(location => ({
    ...location,
    value: Math.floor(location.value * multiplier * (0.85 + Math.random() * 0.3))
  }));

  return {
    statsData,
    wordCloudData,
    locationData,
  };
};

// 词云数据提供者组件（用于在工厂函数中使用 hooks）
const WordCloudProvider: React.FC<{ children: React.ReactNode; maxWords?: number }> = ({
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
      <WordCloudProvider maxWords={100}>
        <WordCloudChart className="w-full h-full flex-1" />
      </WordCloudProvider>
    );
  },

  // 地理分布图
  "geographic-map": (timeRange?: string) => {
    const { locationData } = generateComponentData(timeRange);
    return <LocationHeatMap data={locationData} className="w-full h-full flex-1" />;
  },

  // 事件时间线（使用热点事件列表）
  "event-timeline": () => {
    return <HotEventsList className="w-full h-full flex-1" />;
  },

  // 热点事件列表
  "hot-events-list": () => {
    return <HotEventsList className="w-full h-full flex-1" />;
  },

  // 用户行为图表
  "user-behavior-chart": (timeRange?: string) => {
    const multipliers = {
      today: 1,
      yesterday: 0.95,
      thisWeek: 7.2,
      lastWeek: 6.8,
      thisMonth: 31,
      lastMonth: 29,
      thisQuarter: 92,
      thisYear: 370,
      all: 730,
    };
    const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
    const baseTrendData = [120, 145, 180, 165, 190, 175, 200];
    const trendData = baseTrendData.map(val => Math.floor(val * multiplier * (0.85 + Math.random() * 0.3)));
    return <MiniTrendChart data={trendData} color="#8b5cf6" type="line" />;
  },

  // 活动热力图（使用事件类型柱状图）
  "activity-heatmap": () => {
    return <EventTypeBarChart className="w-full h-full flex-1" />;
  },

  // KPI指标
  "kpi-metrics": (timeRange?: string) => {
    const { statsData } = generateComponentData(timeRange);
    return <StatsOverview data={statsData} className="w-full h-full flex-1" />;
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
    const { statsData } = generateComponentData();
    return <StatsOverview data={statsData} className="w-full h-full flex-1" />;
  },

  "SentimentTrendChart": () => {
    return <SentimentTrendChart className="w-full h-full flex-1" />;
  },

  "WordCloudChart": () => {
    return (
      <WordCloudProvider maxWords={100}>
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

  // 计数器
  "count-up": () => {
    return <CountUp end={1234} className="w-full h-full flex-1" />;
  },

  // 全屏指示器
  "fullscreen-indicator": () => {
    return <FullscreenIndicator className="w-full h-full flex-1" />;
  },

  // 加载旋转器
  "loading-spinner": () => {
    return <Spinner className="w-full h-full flex-1" />;
  },

  // 指标卡片
  "metric-card": () => {
    return <MetricCard
      title="示例指标"
      value={1234}
      change={12.5}
      icon={TrendingUp}
      color="blue"
      className="w-full h-full flex-1"
    />;
  },

  // 导航菜单
  "navigation-menu": () => {
    return <NavigationMenu className="w-full h-full flex-1" />;
  },

  // 情感概览
  "sentiment-overview": () => {
    // 创建默认情感数据
    const sentimentData = {
      positive: 1234,
      negative: 456,
      neutral: 890
    };
    return <SentimentOverview data={sentimentData} className="w-full h-full flex-1" />;
  },
};

// 为 LayoutEditor 使用的组件映射（向后兼容）
export const legacyComponentMap: Record<string, React.ComponentType<any>> = {
  StatsOverview: () => {
    const { statsData } = generateComponentData();
    return <StatsOverview data={statsData} className="flex-1" />;
  },
  SentimentTrendChart: () => <SentimentTrendChart className="flex-1" />,
  WordCloudChart: () => {
    return (
      <WordCloudProvider maxWords={100}>
        <WordCloudChart className="flex-1" />
      </WordCloudProvider>
    );
  },
  GeographicChart: () => <GeographicChart className="flex-1" />,
  HotEventsList: () => <HotEventsList className="flex-1" />,
};

// 渲染组件的通用函数
export const renderComponent = (componentId: string, props: any = {}) => {
  const ComponentWrapper =
    componentWrappers[componentId as keyof typeof componentWrappers];

  if (!ComponentWrapper) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">组件: {componentId}</div>
          <div className="text-xs text-gray-400 mt-1">暂未配置</div>
        </div>
      </div>
    );
  }

  return <ComponentWrapper {...props} />;
};

// 支持时间范围的渲染函数
export const renderComponentWithTimeRange = (componentId: string, timeRange?: string, _props: any = {}) => {
  const ComponentWrapper =
    componentWrappers[componentId as keyof typeof componentWrappers];

  if (!ComponentWrapper) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">组件: {componentId}</div>
          <div className="text-xs text-gray-400 mt-1">暂未配置</div>
        </div>
      </div>
    );
  }

  // 将timeRange作为参数传递给组件包装器函数
  return ComponentWrapper(timeRange);
};

// 默认导出组件映射（用于 LayoutEditor）
export default legacyComponentMap;
