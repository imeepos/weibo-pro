import React, { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useMount } from "@sker/ui/hooks/use-mount";
import { useBoolean } from "@sker/ui/hooks/use-boolean";
import { Spinner } from "@sker/ui/components/ui/spinner";
import EventTypeBarChart from "@/components/charts/EventTypeBarChart";
import WordCloudChart from "@/components/charts/WordCloudChart";
import HotEventsList from "@/components/charts/HotEventsList";
import EmotionCurveChart from "@/components/charts/EmotionCurveChart";
import { StatsOverview, SentimentOverview } from "@/components/ui";
import { LocationHeatMap, UserRelationOverview } from "@/components";
import { LocationData, OverviewStatisticsData } from "@/types";
import { OverviewAPI } from '@/services/api';
import { createLogger } from '@/utils';
import { useUpdateEffect } from "@sker/ui/hooks/use-update-effect";
import GeoHeatMap from "@sker/ui/components/ui/geo-heat-map";

const logger = createLogger('DataOverview');

const DataOverview: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [statsData, setStatsData] = useState<OverviewStatisticsData | null>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, { setTrue: startLoading, setFalse: stopLoading }] = useBoolean(true);

  const loadData = async () => {
    try {
      startLoading();
      const [statisticsResult, sentimentResult] = await Promise.all([
        OverviewAPI.getStatistics(selectedTimeRange),
        OverviewAPI.getSentiment(selectedTimeRange),
      ]);

      setStatsData(statisticsResult || null);
      setSentimentData(sentimentResult || null);

    } catch (error) {
      logger.error('Failed to load data', error);
    } finally {
      stopLoading();
    }
  };

  useMount(loadData);
  useUpdateEffect(() => {
    loadData();
  }, [selectedTimeRange]);

  const statsOverviewData = statsData ? {
    events: { value: statsData.eventCount, change: statsData.eventCountChange },
    posts: { value: statsData.postCount, change: statsData.postCountChange },
    users: { value: statsData.userCount, change: statsData.userCountChange },
    interactions: {
      value: statsData.interactionCount,
      change: statsData.interactionCountChange,
    },
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex gap-3 p-4 overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
        <div className="flex-shrink-0">
          <StatsOverview data={statsOverviewData} />
        </div>
        <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
          <HotEventsList />
        </div>
        <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
          <WordCloudChart maxWords={200} />
        </div>
      </div>

      <div className="flex-[1.5] min-w-0 flex flex-col gap-3 min-h-0">
        <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden">
          <GeoHeatMap
            data={[
              {
                coordinates: [
                  116.4074,
                  39.9042
                ],
                name: '北京',
                sentiment: 'neutral',
                value: 1580
              },
              {
                coordinates: [
                  121.4737,
                  31.2304
                ],
                name: '上海',
                sentiment: 'positive',
                value: 1420
              },
              {
                coordinates: [
                  113.2644,
                  23.1291
                ],
                name: '广州',
                sentiment: 'positive',
                value: 980
              },
              {
                coordinates: [
                  114.0579,
                  22.5431
                ],
                name: '深圳',
                sentiment: 'positive',
                value: 1200
              },
              {
                coordinates: [
                  104.0668,
                  30.5728
                ],
                name: '成都',
                sentiment: 'neutral',
                value: 850
              },
              {
                coordinates: [
                  120.1551,
                  30.2741
                ],
                name: '杭州',
                sentiment: 'positive',
                value: 920
              },
              {
                coordinates: [
                  106.5516,
                  29.563
                ],
                name: '重庆',
                sentiment: 'neutral',
                value: 760
              },
              {
                coordinates: [
                  108.9398,
                  34.3416
                ],
                name: '西安',
                sentiment: 'neutral',
                value: 680
              },
              {
                coordinates: [
                  114.3055,
                  30.5931
                ],
                name: '武汉',
                sentiment: 'negative',
                value: 790
              },
              {
                coordinates: [
                  118.7969,
                  32.0603
                ],
                name: '南京',
                sentiment: 'positive',
                value: 640
              }
            ]}
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
  );
};

export default DataOverview;
