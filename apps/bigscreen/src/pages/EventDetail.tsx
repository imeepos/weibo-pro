import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs } from '@sker/ui/components/ui/tabs';
import { Skeleton } from '@sker/ui/components/ui/skeleton';

import { PageHeader } from './event-detail/PageHeader';
import { EventInfoCard } from './event-detail/EventInfoCard';
import { TabNav } from './event-detail/TabNav';
import { OverviewTab } from './event-detail/OverviewTab';
import { NetworkTab } from './event-detail/NetworkTab';
import { GeographicTab } from './event-detail/GeographicTab';
import { TrendTab } from './event-detail/TrendTab';
import { OpinionsTab } from './event-detail/OpinionsTab';
import { SentimentTab } from './event-detail/SentimentTab';
import { AdvancedTab } from './event-detail/AdvancedTab';
import { UserAnalysisTab } from './event-detail/UserAnalysisTab';
import { ContentAnalysisTab } from './event-detail/ContentAnalysisTab';
import { useEventDetailData } from './event-detail/useEventDetailData';
import { useKeywordEditor } from './event-detail/useKeywordEditor';
import {
  computeEngagementStats,
  computeStats,
  getSentimentConfig,
  getTrendConfig,
} from './event-detail/utils';

const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const {
    eventData,
    timeSeriesData,
    trendData,
    userRelationNetwork,
    geographicData,
    geographicStats,
    keywordData,
    engagementTrendData,
    propagationVelocityData,
    influencePredictionData,
    communityEvolutionData,
    userStratificationData,
    commentDepthData,
    postingTimeData,
    activeTab,
    isRefreshing,
    isRefreshingCache,
    tabsState,
    overviewWidgets,
    trendWidgets,
    opinionWidgets,
    userAnalysisWidgets,
    sentimentWidgets,
    fetchEventData,
    loadTabData,
    handleTabChange,
    handleRefreshCache,
    loadOverviewPhase2Widgets,
    loadTrendWidgets,
    loadOpinionWidgets,
    loadUserAnalysisWidgets,
    loadSentimentWidgets,
    updateEventKeywords,
  } = useEventDetailData(eventId, navigate);

  const keywordEditor = useKeywordEditor(eventId, eventData, updateEventKeywords);

  const sentimentConfig = useMemo(
    () => (eventData ? getSentimentConfig(eventData.sentiment) : null),
    [eventData],
  );
  const trendConfig = useMemo(
    () => (eventData ? getTrendConfig(eventData.trend) : null),
    [eventData],
  );
  const stats = useMemo(() => computeStats(trendData), [trendData]);
  const engagementStats = useMemo(
    () => computeEngagementStats(engagementTrendData),
    [engagementTrendData],
  );

  // 加载骨架
  if (!eventData) {
    return (
      <div className="space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        lastUpdate={eventData.lastUpdate}
        isRefreshing={isRefreshing}
        isRefreshingCache={isRefreshingCache}
        onBack={() => navigate('/event-analysis')}
        onRefresh={() => fetchEventData(true)}
        onRefreshCache={handleRefreshCache}
      />

      <EventInfoCard
        eventData={eventData}
        trendConfig={trendConfig}
        sentimentConfig={sentimentConfig}
        keywordEditor={keywordEditor}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabNav tabsState={tabsState} />

        <OverviewTab
          eventData={eventData}
          stats={stats}
          engagementStats={engagementStats}
          engagementTrendData={engagementTrendData}
          timeSeriesData={timeSeriesData}
          keywordData={keywordData}
          overviewWidgets={overviewWidgets}
          loadOverviewPhase2Widgets={loadOverviewPhase2Widgets}
        />

        <NetworkTab
          loadingState={tabsState.network.loadingState}
          userRelationNetwork={userRelationNetwork}
          onRetry={() => loadTabData('network', true)}
        />

        <GeographicTab
          loadingState={tabsState.geographic.loadingState}
          geographicData={geographicData}
          geographicStats={geographicStats}
          stats={stats}
          eventData={eventData}
          onRetry={() => loadTabData('geographic', true)}
        />

        <TrendTab
          loadingState={tabsState.trend.loadingState}
          trendWidgets={trendWidgets}
          engagementTrendData={engagementTrendData}
          onRetryTab={() => loadTabData('trend', true)}
          onRetryWidgets={loadTrendWidgets}
        />

        <OpinionsTab
          loadingState={tabsState.opinions.loadingState}
          opinionWidgets={opinionWidgets}
          onRetryTab={() => loadTabData('opinions', true)}
          onRetryWidgets={loadOpinionWidgets}
        />

        <SentimentTab
          loadingState={tabsState.sentiment.loadingState}
          sentimentWidgets={sentimentWidgets}
          timeSeriesData={timeSeriesData}
          eventId={eventId}
          onRetryTab={() => loadTabData('sentiment', true)}
          onRetryWidgets={loadSentimentWidgets}
        />

        <AdvancedTab
          loadingState={tabsState.advanced.loadingState}
          propagationVelocityData={propagationVelocityData}
          influencePredictionData={influencePredictionData}
          communityEvolutionData={communityEvolutionData}
          onRetryTab={() => loadTabData('advanced', true)}
        />

        <UserAnalysisTab
          loadingState={tabsState['user-analysis'].loadingState}
          userAnalysisWidgets={userAnalysisWidgets}
          userStratificationData={userStratificationData}
          userRelationNetwork={userRelationNetwork}
          onRetryTab={() => loadTabData('user-analysis', true)}
          onRetryWidgets={loadUserAnalysisWidgets}
        />

        <ContentAnalysisTab
          loadingState={tabsState['content-analysis'].loadingState}
          postingTimeData={postingTimeData}
          commentDepthData={commentDepthData}
          onRetryTab={() => loadTabData('content-analysis', true)}
        />
      </Tabs>
    </div>
  );
};

export default EventDetail;
