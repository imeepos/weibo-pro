import React, { useState, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";

// 导入图表组件
import EventTypeBarChart from "@/components/charts/EventTypeBarChart";
import WordCloudChart from "@/components/charts/WordCloudChart";
import HotEventsList from "@/components/charts/HotEventsList";
import EmotionCurveChart from "@/components/charts/EmotionCurveChart";
import { StatsOverview, SentimentOverview } from "@/components/ui";
import { LocationHeatMap } from "@/components";
import { LocationData, OverviewStatisticsData } from "@/types";
import { OverviewAPI } from '@/services/api';
import { createLogger } from '@/utils';

const logger = createLogger('DataOverview');

const DataOverview: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [statsData, setStatsData] = useState<OverviewStatisticsData | null>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statisticsResult, sentimentResult, locationsResult] = await Promise.all([
          OverviewAPI.getStatistics(selectedTimeRange),
          OverviewAPI.getSentiment(selectedTimeRange),
          OverviewAPI.getLocations(selectedTimeRange)
        ]);
        console.log({
          statisticsResult, sentimentResult, locationsResult
        })
        setStatsData(statisticsResult || null);
        setSentimentData(sentimentResult || null);
        // 转换 OverviewLocation 为 LocationData 格式
        const convertedLocations: LocationData[] = (locationsResult || []).map(loc => ({
          name: loc.region,
          value: loc.count,
          sentiment: 'neutral' as const, // 默认值
          coordinates: loc.coordinates || [0, 0]
        }));
        setLocationData(convertedLocations);
      } catch (error) {
        logger.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTimeRange]);

  // 构建 StatsOverview 组件的数据结构
  const statsOverviewData = statsData ? {
    events: { value: statsData.eventCount, change: statsData.eventCountChange },
    posts: { value: statsData.postCount, change: statsData.postCountChange },
    users: { value: statsData.userCount, change: statsData.userCountChange },
    interactions: {
      value: statsData.interactionCount,
      change: statsData.interactionCountChange,
    },
  } : null;

  return (
    <div className="dashboard-no-scroll">
      {/* 主要布局：左中右结构 - 自适应高度 */}
      <div className="dashboard-main-content">
        {/* 左侧区域：占4列 - 指标和热点事件 */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4
                        flex flex-col gap-2 lg:gap-4 xl:gap-5
                        overflow-hidden">
          {/* 指标概览 - 由内部元素撑开高度 */}
          <div className="stats-overview-container overflow-hidden">
            <StatsOverview data={statsOverviewData} />
          </div>
          {/* 热点事件 - 自适应高度 */}
          <div className="sentiment-overview-card flex-1 min-h-0 overflow-hidden">
            <HotEventsList />
          </div>
        </div>

        {/* 中间区域：占5列 - 主要地图区域 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5
                        glass-card p-2 lg:p-3 xl:p-4 sentiment-overview-card
                        overflow-hidden flex flex-col">
          <LocationHeatMap
            data={locationData}
            title=""
          />
        </div>

        {/* 右侧区域：占3列 - 情感分析 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3
                        flex flex-col gap-3 lg:gap-4 xl:gap-5
                        overflow-hidden">
          <div className="glass-card sentiment-overview-card flex-1 min-h-0 overflow-hidden">
            <h3 className="text-lg font-medium text-foreground p-2 lg:p-3 xl:p-4">情感分析</h3>
            <div className="card-content h-full">
              <SentimentOverview data={sentimentData} />
              <EmotionCurveChart />
            </div>
          </div>
        </div>
      </div>

      {/* 底部区域：3个模块 - 固定比例高度 */}
      <div className="dashboard-bottom-content">
        {/* 热词分析 */}
        <div className="glass-card sentiment-overview-card min-h-0 overflow-hidden">
          <h3 className="text-lg font-medium text-foreground p-2 lg:p-3 xl:p-4">热词分析</h3>
          <div className="card-content-lg h-full">
            <WordCloudChart
              title=""
              maxWords={50}
            />
          </div>
        </div>

        {/* 事件分析 */}
        <div className="glass-card sentiment-overview-card min-h-0 overflow-hidden">
          <h3 className="text-lg font-medium text-foreground p-2 lg:p-3 xl:p-4">事件分析</h3>
          <div className="card-content-lg h-full">
            <HotEventsList />
          </div>
        </div>

        {/* 事件类型分布 */}
        <div className="glass-card sentiment-overview-card min-h-0 overflow-hidden">
          <h3 className="text-lg font-medium text-foreground p-2 lg:p-3 xl:p-4">事件类型</h3>
          <div className="card-content-lg h-full">
            <EventTypeBarChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataOverview;
