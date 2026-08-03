import { useCallback, useState } from 'react';
import { root } from '@sker/core';
import {
  EventsController,
  SpreadBreadthController,
  MediaTypeController,
} from '@sker/sdk';
import type {
  EventAbnormalUser,
  EventAnomaly,
  EventEmotionMapItem,
  EventOpinionCluster,
  EventSentimentTrendDetailedPoint,
  EventUserRiskProfile,
  EventUserEmotionInsight,
  MediaTypeAnalysis,
  SpreadBreadthAnalysis,
} from '@sker/sdk';
import {
  createAnalysisWidgetState,
  resolveAnalysisWidgetState,
} from '@/types/analysis-widget';
import type {
  EventInstitutionAccount,
  EventMilestone,
  EventTopicOverview,
  EventsControllerPhase2,
  EventsControllerPhase3,
  EventsControllerPhase4,
  OpinionWidgets,
  OverviewWidgets,
  SentimentWidgets,
  TrendWidgets,
  UserAnalysisWidgets,
} from './types';

export function useEventWidgets(eventId?: string) {
  const [overviewWidgets, setOverviewWidgets] = useState<OverviewWidgets>({
    milestones: createAnalysisWidgetState(),
    topicOverview: createAnalysisWidgetState(),
    institutions: createAnalysisWidgetState(),
  });
  const [trendWidgets, setTrendWidgets] = useState<TrendWidgets>({
    spreadBreadth: createAnalysisWidgetState(),
    mediaType: createAnalysisWidgetState(),
    anomalies: createAnalysisWidgetState(),
  });
  const [opinionWidgets, setOpinionWidgets] = useState<OpinionWidgets>({
    clusters: createAnalysisWidgetState(),
  });
  const [userAnalysisWidgets, setUserAnalysisWidgets] = useState<UserAnalysisWidgets>({
    riskProfile: createAnalysisWidgetState(),
    abnormalUsers: createAnalysisWidgetState(),
  });
  const [sentimentWidgets, setSentimentWidgets] = useState<SentimentWidgets>({
    transition: createAnalysisWidgetState(),
    scatter: createAnalysisWidgetState(),
    intensity: createAnalysisWidgetState(),
    emotionMap: createAnalysisWidgetState(),
    userInsights: createAnalysisWidgetState(),
    detailedTrend: createAnalysisWidgetState(),
  });

  const loadOverviewPhase2Widgets = useCallback(async () => {
    if (!eventId) return;

    setOverviewWidgets({
      milestones: createAnalysisWidgetState({ status: 'loading' }),
      topicOverview: createAnalysisWidgetState({ status: 'loading' }),
      institutions: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase2;
    const settled = await Promise.allSettled([
      controller.getEventMilestones(eventId),
      controller.getEventTopicOverview(eventId),
      controller.getEventInstitutions(eventId),
    ]);

    setOverviewWidgets({
      milestones: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventMilestone[]>,
        (value) => value.length === 0,
      ),
      topicOverview: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<EventTopicOverview>,
        (value) => value.topTopics.length === 0,
      ),
      institutions: resolveAnalysisWidgetState(
        settled[2] as PromiseSettledResult<EventInstitutionAccount[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadTrendWidgets = useCallback(async () => {
    if (!eventId) return;

    setTrendWidgets({
      spreadBreadth: createAnalysisWidgetState({ status: 'loading' }),
      mediaType: createAnalysisWidgetState({ status: 'loading' }),
      anomalies: createAnalysisWidgetState({ status: 'loading' }),
    });

    const eventsController = root.get(EventsController);
    const spreadBreadthController = root.get(SpreadBreadthController);
    const mediaTypeController = root.get(MediaTypeController);

    const settled = await Promise.allSettled([
      spreadBreadthController.getAnalysis(eventId),
      mediaTypeController.getDistribution(eventId),
      eventsController.getAnomalies(eventId),
    ]);

    setTrendWidgets({
      spreadBreadth: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<SpreadBreadthAnalysis>,
        (value) => value.totalReposts === 0 && !value.propagationPaths?.length,
      ),
      mediaType: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<MediaTypeAnalysis>,
        (value) => value.distribution.length === 0,
      ),
      anomalies: resolveAnalysisWidgetState(
        settled[2] as PromiseSettledResult<EventAnomaly[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadOpinionWidgets = useCallback(async () => {
    if (!eventId) return;

    setOpinionWidgets({
      clusters: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase3;
    const settled = await Promise.allSettled([
      controller.getEventOpinionClusters(eventId),
    ]);

    setOpinionWidgets({
      clusters: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventOpinionCluster[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadUserAnalysisWidgets = useCallback(async () => {
    if (!eventId) return;

    setUserAnalysisWidgets({
      riskProfile: createAnalysisWidgetState({ status: 'loading' }),
      abnormalUsers: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase4;
    const settled = await Promise.allSettled([
      controller.getEventRiskProfile(eventId),
      controller.getEventAbnormalUsers(eventId),
    ]);

    setUserAnalysisWidgets({
      riskProfile: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventUserRiskProfile>,
        (value) => value.totalUsers === 0,
      ),
      abnormalUsers: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<EventAbnormalUser[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const loadSentimentWidgets = useCallback(async () => {
    if (!eventId) return;

    setSentimentWidgets({
      transition: createAnalysisWidgetState({ status: 'loading' }),
      scatter: createAnalysisWidgetState({ status: 'loading' }),
      intensity: createAnalysisWidgetState({ status: 'loading' }),
      emotionMap: createAnalysisWidgetState({ status: 'loading' }),
      userInsights: createAnalysisWidgetState({ status: 'loading' }),
      detailedTrend: createAnalysisWidgetState({ status: 'loading' }),
    });

    const eventsController = root.get(EventsController) as EventsController & EventsControllerPhase3;
    const settled = await Promise.allSettled([
      Promise.resolve({ eventId }),
      eventsController.getSentimentHotness(eventId),
      eventsController.getSentimentIntensity(eventId),
      eventsController.getEventEmotionMap(eventId),
      eventsController.getEventUserEmotionInsights(eventId),
      eventsController.getEventSentimentTrendDetailed(eventId),
    ]);

    setSentimentWidgets({
      transition: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<{ eventId: string }>,
        () => false,
      ),
      scatter: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>,
        (value) => value.length === 0,
      ),
      intensity: resolveAnalysisWidgetState(
        settled[2] as PromiseSettledResult<Array<{ intensity: number; count: number }>>,
        (value) => value.length === 0,
      ),
      emotionMap: resolveAnalysisWidgetState(
        settled[3] as PromiseSettledResult<EventEmotionMapItem[]>,
        (value) => value.length === 0,
      ),
      userInsights: resolveAnalysisWidgetState(
        settled[4] as PromiseSettledResult<EventUserEmotionInsight[]>,
        (value) => value.length === 0,
      ),
      detailedTrend: resolveAnalysisWidgetState(
        settled[5] as PromiseSettledResult<EventSentimentTrendDetailedPoint[]>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const resetAllWidgets = useCallback(() => {
    setOverviewWidgets({
      milestones: createAnalysisWidgetState(),
      topicOverview: createAnalysisWidgetState(),
      institutions: createAnalysisWidgetState(),
    });
    setTrendWidgets({
      spreadBreadth: createAnalysisWidgetState(),
      mediaType: createAnalysisWidgetState(),
      anomalies: createAnalysisWidgetState(),
    });
    setOpinionWidgets({
      clusters: createAnalysisWidgetState(),
    });
    setUserAnalysisWidgets({
      riskProfile: createAnalysisWidgetState(),
      abnormalUsers: createAnalysisWidgetState(),
    });
    setSentimentWidgets({
      transition: createAnalysisWidgetState(),
      scatter: createAnalysisWidgetState(),
      intensity: createAnalysisWidgetState(),
      emotionMap: createAnalysisWidgetState(),
      userInsights: createAnalysisWidgetState(),
      detailedTrend: createAnalysisWidgetState(),
    });
  }, []);

  return {
    overviewWidgets,
    trendWidgets,
    opinionWidgets,
    userAnalysisWidgets,
    sentimentWidgets,
    loadOverviewPhase2Widgets,
    loadTrendWidgets,
    loadOpinionWidgets,
    loadUserAnalysisWidgets,
    loadSentimentWidgets,
    resetAllWidgets,
  };
}
