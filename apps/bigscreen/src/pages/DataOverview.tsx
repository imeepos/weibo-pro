import React from "react";
import { Spinner } from "@sker/ui/components/ui/spinner";
import EventTypeBarChart from "@/components/charts/EventTypeBarChart";
import WordCloudChart from "@/components/charts/WordCloudChart";
import HotEventsList from "@/components/charts/HotEventsList";
import EmotionCurveChart from "@/components/charts/EmotionCurveChart";
import {
  StatsOverview,
  SentimentOverview,
  ErrorState,
  EmptyState,
  TimeRangeDisplay,
  RefreshIndicator
} from "@/components/ui";
import { LocationHeatMap, UserRelationOverview } from "@/components";
import GeoHeatMap from "@sker/ui/components/ui/geo-heat-map";
import { useOverviewData } from "@/hooks/useOverviewData";
import { useAppStore } from "@/stores/useAppStore";
import { CHINA_CITIES_HEAT_DATA, MAX_WORD_CLOUD_WORDS } from "@/constants/mockData";

const DataOverview: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const {
    statsOverviewData,
    sentimentData,
    loading,
    error,
    isStale,
    refetch
  } = useOverviewData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // 即使数据为 0 也显示完整页面，让用户看到可视化界面
  if (!statsOverviewData || !sentimentData) {
    return (
      <EmptyState
        title="暂无数据"
        description="无法加载数据"
      />
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col gap-3 p-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <TimeRangeDisplay timeRange={selectedTimeRange} />
        <RefreshIndicator isStale={isStale} onRefresh={refetch} />
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-shrink-0">
            <StatsOverview data={statsOverviewData} />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <HotEventsList />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <WordCloudChart maxWords={MAX_WORD_CLOUD_WORDS} />
          </div>
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden">
            <GeoHeatMap
              data={CHINA_CITIES_HEAT_DATA}
              title="全国舆情热度分布"
            />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <UserRelationOverview />
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <SentimentOverview data={sentimentData} />
            <EmotionCurveChart className="flex-1 min-h-0" />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <EventTypeBarChart className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataOverview;
