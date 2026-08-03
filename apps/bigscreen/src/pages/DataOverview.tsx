import React, { useMemo } from "react";
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
import { useIndexRealtimeSnapshot } from "@/hooks/useIndexRealtimeSnapshot";

const DataOverview: React.FC = () => {
  const {
    data: snapshot,
    loading,
    error,
    refetch,
  } = useIndexRealtimeSnapshot();

  const locationData = useMemo<GeoDataPoint[]>(() => {
    const locations = snapshot?.locations ?? [];
    return locations
      .filter(loc => loc.coordinates && loc.coordinates.length === 2)
      .map(loc => ({
        name: loc.region,
        coordinates: loc.coordinates!,
        value: loc.count,
        sentiment: 'neutral' as const
      }));
  }, [snapshot?.locations]);

  const hotEvents = useMemo(() => {
    return (snapshot?.hotEvents ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      postCount: event.posts ?? 0,
      sentiment: { positive: 0, negative: 0, neutral: 0 },
      hotness: event.heat ?? 0,
      trend: event.trend === 'rising' ? 'up' as const : event.trend === 'falling' ? 'down' as const : 'stable' as const,
      trendData: [],
    }));
  }, [snapshot?.hotEvents]);

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
  if (!snapshot) {
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
            <StatsOverview
              data={{
                events: {
                  value: snapshot.statistics.eventCount,
                  change: snapshot.statistics.eventCountChange,
                },
                posts: {
                  value: snapshot.statistics.postCount,
                  change: snapshot.statistics.postCountChange,
                },
                users: {
                  value: snapshot.statistics.userCount,
                  change: snapshot.statistics.userCountChange,
                },
                interactions: {
                  value: snapshot.statistics.interactionCount,
                  change: snapshot.statistics.interactionCountChange,
                },
              }}
            />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-0">
            <HotEventsList events={hotEvents} loading={false} />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <WordCloudChart
              data={snapshot.wordCloud.map((item) => ({
                keyword: item.keyword,
                weight: item.weight,
                sentiment: item.sentiment,
              }))}
              maxWords={snapshot.wordCloud.length}
            />
          </div>
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden">
            <GeoHeatMap
              data={locationData}
              title="全国舆情热度分布"
            />
          </div>
          <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">用户网络摘要</h2>
              <p className="text-xs text-muted-foreground">
                关系强度与社区规模快速概览
              </p>
            </div>
            <div className="h-[calc(100%-61px)] p-4 pt-3">
              <UserRelationOverview className="h-full" network={snapshot.userRelationNetwork} loading={false} />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <SentimentOverview data={snapshot.sentiment} />
            <EmotionCurveChart
              className="flex-1 min-h-0"
              data={{
                hours: snapshot.emotionCurve.categories,
                positiveData: snapshot.emotionCurve.series.find((item) => item.name === '正面')?.data ?? [],
                negativeData: snapshot.emotionCurve.series.find((item) => item.name === '负面')?.data ?? [],
                neutralData: snapshot.emotionCurve.series.find((item) => item.name === '中性')?.data ?? [],
              }}
              loading={false}
            />
          </div>
          <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4">
            <EventTypeBarChart
              className="h-full"
              data={snapshot.eventTypes.categories.map((name, index) => ({
                name,
                value: snapshot.eventTypes.series[0]?.data[index] ?? 0,
              }))}
              loading={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataOverview;
