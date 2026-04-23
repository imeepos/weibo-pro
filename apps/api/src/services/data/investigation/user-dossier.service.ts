import { Injectable } from '@sker/core';
import type { UserInvestigationDossier } from '@sker/sdk';
import type {
  UserDossierAccountSnapshot,
  UserDossierEvidenceSamples,
  UserDossierOptions,
} from './types';

@Injectable({ providedIn: 'root' })
export class UserDossierService {
  async getDossier(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier> {
    const accountSnapshot = await this.loadAccountSnapshot(weiboUserId);
    const evidenceSamples = await this.loadEvidenceSamples(weiboUserId, options);

    return {
      accountSnapshot,
      eventRiskContext: {
        eventId: options.eventId ?? null,
        eventRiskLevel: 'low',
        eventRiskScore: 0,
        riskSignals: [],
        firstSeenAt: null,
        lastSeenAt: null,
        eventPostCount: 0,
        eventInteractionCount: 0,
      },
      historyCoverage: {
        windowDays: options.windowDays,
        collectedPostCount: 0,
        collectedCommentCount: 0,
        collectedRepostCount: 0,
        timeRangeStart: null,
        timeRangeEnd: null,
        samplingStrategy: 'recent+spikes',
      },
      behaviorTimeline: {
        postingByDay: [],
        postingByHour: [],
        interactionByDay: [],
        spikeMoments: [],
        activePeriods: [],
      },
      topicAndSentimentProfile: {
        topicClusters: [],
        primaryKeywords: [],
        eventTypes: [],
        sentimentTrend: [],
        sentimentDistribution: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        topicShiftMoments: [],
      },
      relationSummary: {
        topConnectedUsers: [],
        relationTypes: [],
        sharedEvents: [],
        relationClusters: [],
        suspiciousCoordinationHints: [],
      },
      evidenceSamples,
      preDistillationSummary: {
        candidateLabels: [],
        anomalyHints: [],
        coverageWarnings: [],
        humanReviewNeeded: false,
      },
    };
  }

  protected async loadAccountSnapshot(weiboUserId: string): Promise<UserDossierAccountSnapshot> {
    return {
      weiboUserId,
      screenName: null,
      displayName: null,
      avatar: null,
      description: null,
      location: null,
      followersCount: 0,
      friendsCount: 0,
      statusesCount: 0,
      verified: false,
      verifiedType: null,
      verifiedReason: null,
      creditScore: null,
      urisk: null,
      createdAt: null,
    };
  }

  protected async loadEvidenceSamples(
    _weiboUserId: string,
    _options: UserDossierOptions,
  ): Promise<UserDossierEvidenceSamples> {
    return {
      eventSamples: [],
      historySamples: [],
      relationSamples: [],
      nlpSamples: [],
    };
  }
}
