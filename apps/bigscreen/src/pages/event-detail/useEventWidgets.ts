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
  EventOpinionCluster,
  EventUserRiskProfile,
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
    scatter: createAnalysisWidgetState(),
  });

  const loadOverviewPhase2Widgets = useCallback(async () => {
    if (!eventId) return;

    setOverviewWidgets({
      milestones: createAnalysisWidgetState({ status: 'loading' }),
      institutions: createAnalysisWidgetState({ status: 'loading' }),
    });

    const controller = root.get(EventsController) as EventsController & EventsControllerPhase2;
    const settled = await Promise.allSettled([
      controller.getEventMilestones(eventId),
      controller.getEventInstitutions(eventId),
    ]);

    setOverviewWidgets({
      milestones: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<EventMilestone[]>,
        (value) => value.length === 0,
      ),
      institutions: resolveAnalysisWidgetState(
        settled[1] as PromiseSettledResult<EventInstitutionAccount[]>,
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
      scatter: createAnalysisWidgetState({ status: 'loading' }),
    });

    const eventsController = root.get(EventsController);
    const settled = await Promise.allSettled([
      eventsController.getSentimentHotness(eventId),
    ]);

    setSentimentWidgets({
      scatter: resolveAnalysisWidgetState(
        settled[0] as PromiseSettledResult<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>,
        (value) => value.length === 0,
      ),
    });
  }, [eventId]);

  const resetAllWidgets = useCallback(() => {
    setOverviewWidgets({
      milestones: createAnalysisWidgetState(),
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
      scatter: createAnalysisWidgetState(),
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
