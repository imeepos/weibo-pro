import React, { useState, useEffect, useMemo } from "react";
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
} from "@/components/ui";
import { UserRelationOverview } from "@/components";
import GeoHeatMap, { type GeoDataPoint } from "@sker/ui/components/ui/geo-heat-map";
import { useOverviewData } from "@/hooks/useOverviewData";
import { useAppStore } from "@/stores/useAppStore";
import { MAX_WORD_CLOUD_WORDS } from "@/constants/mockData";
import { OverviewController } from "@sker/sdk";
import { root, createLogger } from "@sker/core";
import { useWordCloudData } from "@/hooks/useChartData";

const logger = createLogger('DataOverview');

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

  const { data: wordCloudData } = useWordCloudData(MAX_WORD_CLOUD_WORDS);

  const [locationData, setLocationData] = useState<GeoDataPoint[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);

  // 获取地理位置数据
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLocationLoading(true);
        const controller = root.get(OverviewController);
        const locations = await controller.getLocations(selectedTimeRange);

        // 转换 API 数据为 GeoDataPoint 格式
        const geoData: GeoDataPoint[] = (locations || [])
          .filter(loc => loc.coordinates && loc.coordinates.length === 2)
          .map(loc => ({
            name: loc.region,
            coordinates: loc.coordinates!,
            value: loc.count,
            sentiment: 'neutral' as const
          }));

        setLocationData(geoData);
      } catch (err) {
        logger.error('Failed to fetch location data:', err);
        setLocationData([]);
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLocationData();
  }, [selectedTimeRange]);

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
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-shrink-0">
            <StatsOverview data={statsOverviewData} />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-0">
            <HotEventsList />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <WordCloudChart data={wordCloudData} maxWords={MAX_WORD_CLOUD_WORDS} />
          </div>
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden">
            {locationLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-6" />
              </div>
            ) : (
              <GeoHeatMap
                data={locationData}
                title="全国舆情热度分布"
              />
            )}
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
