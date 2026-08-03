/**
 * 用户调查与蒸馏(Distillation)相关类型
 */
import type {
  DistilledMemorySection,
  DistilledMemoryStability,
  MemoryType,
  RelationType,
  RiskLevel,
} from './base'

export type InvestigationTaskStatus =
  | 'queued'
  | 'crawling'
  | 'extracting'
  | 'aggregating'
  | 'publishing'
  | 'analyzing'
  | 'review_pending'
  | 'published'
  | 'failed'

export type InvestigationReviewStatus =
  | 'auto_pass'
  | 'human_pending'
  | 'human_approved'
  | 'human_rejected'

export interface UserInvestigationQueueQuery {
  eventId?: string
  riskLevel?: string
  status?: InvestigationTaskStatus
  page?: number
  pageSize?: number
}

export interface UserInvestigationQueueItem {
  weiboUserId: string
  screenName: string
  avatar: string | null
  eventRiskScore: number
  eventRiskLevel: RiskLevel | 'critical'
  status: InvestigationTaskStatus
  hasPersona: boolean
  lastDistilledAt: string | null
  riskSignals: string[]
}

export interface UserInvestigationQueueResponse {
  items: UserInvestigationQueueItem[]
  total: number
  filteredCount: number
  coverageRate: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UserInvestigationDossier {
  accountSnapshot: {
    weiboUserId: string
    screenName: string | null
    displayName: string | null
    avatar: string | null
    description: string | null
    location: string | null
    followersCount: number
    friendsCount: number
    statusesCount: number
    verified: boolean
    verifiedType: number | null
    verifiedReason: string | null
    creditScore: number | null
    urisk: number | null
    createdAt: string | null
  }
  eventRiskContext: {
    eventId: string | null
    eventRiskLevel: RiskLevel | 'critical'
    eventRiskScore: number
    riskSignals: Array<{ type: string; label: string; score: number }>
    firstSeenAt: string | null
    lastSeenAt: string | null
    eventPostCount: number
    eventInteractionCount: number
  }
  historyCoverage: {
    windowDays: number
    collectedPostCount: number
    collectedCommentCount: number
    collectedRepostCount: number
    timeRangeStart: string | null
    timeRangeEnd: string | null
    samplingStrategy: string
  }
  behaviorTimeline: {
    postingByDay: Array<{ day: string; count: number }>
    postingByHour: Array<{ hour: number; count: number }>
    interactionByDay: Array<{ day: string; count: number }>
    spikeMoments: Array<{ timestamp: string; reason: string }>
    activePeriods: string[]
  }
  topicAndSentimentProfile: {
    topicClusters: Array<{ label: string; weight: number; keywords: string[] }>
    primaryKeywords: string[]
    eventTypes: Array<{ type: string; weight: number }>
    sentimentTrend: Array<{ timestamp: string; positive: number; negative: number; neutral: number }>
    sentimentDistribution: { positive: number; negative: number; neutral: number }
    topicShiftMoments: Array<{ timestamp: string; from: string; to: string }>
  }
  relationSummary: {
    topConnectedUsers: Array<{ userId: string; weight: number; relationTypes: string[] }>
    relationTypes: Array<{ type: string; count: number }>
    sharedEvents: Array<{ eventId: string; count: number }>
    relationClusters: Array<{ label: string; members: string[] }>
    suspiciousCoordinationHints: string[]
  }
  evidenceSamples: {
    eventSamples: Array<{ sourceId: string; excerpt: string; reason: string }>
    historySamples: Array<{ sourceId: string; excerpt: string; reason: string }>
    relationSamples: Array<{ sourceId: string; excerpt: string; reason: string }>
    nlpSamples: Array<{ sourceId: string; excerpt: string; reason: string }>
  }
  preDistillationSummary: {
    candidateLabels: string[]
    anomalyHints: string[]
    coverageWarnings: string[]
    humanReviewNeeded: boolean
  }
}

export interface DistillationTaskSummary {
  id: string
  weiboUserId: string
  eventId: string | null
  status: InvestigationTaskStatus
  historyWindowDays: number
  sourcePostCount: number
  sourceCommentCount: number
  sourceRepostCount: number
  evidenceSampleCount: number
  model: string | null
  promptVersion: string | null
  distilledSummary: string | null
  reviewStatus: InvestigationReviewStatus | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  progress?: DistillationTaskProgress
}

export interface CreateDistillationTaskRequest {
  eventId?: string | null
  historyWindowDays?: number
}

export interface ReviewDistillationTaskRequest {
  decision: 'approve' | 'reject'
  note?: string
}

export interface DistilledRiskDriver {
  label: string
  reason: string
  confidence: number
}

export interface DistilledRelationConnection {
  targetUserId: string
  relationType: string
  strength: number
  note: string
}

export interface DistilledMemoryEvidenceRef {
  sourceTable: string
  sourceId: string
  excerpt?: string
  score: number
}

export interface DistilledMemoryRelationDraft {
  relationType: RelationType
  targetKind: 'memory' | 'persona'
  targetRef: string
  note?: string
}

export interface DistilledMemoryDraft {
  type: MemoryType
  name: string
  description: string | null
  content: string
  evidenceRefs: DistilledMemoryEvidenceRef[]
  relationDrafts: DistilledMemoryRelationDraft[]
  section?: DistilledMemorySection
  isSectionHub?: boolean
  stability?: DistilledMemoryStability
}

export interface DistilledUserProfile {
  summary: {
    short: string
    long: string
    confidence: number
  }
  identity: {
    inferredRole: string
    roleConfidence: number
    accountNature: string[]
    stableTraits: string[]
  }
  behavior: {
    activityPattern: string[]
    postingRhythm: string
    escalationPattern: string[]
    historicalStability: string
  }
  content: {
    primaryTopics: string[]
    narrativeStyles: string[]
    emotionalTendency: string[]
    stancePattern: string[]
  }
  risk: {
    overallLevel: RiskLevel | 'critical'
    overallScore: number
    riskDrivers: DistilledRiskDriver[]
    reviewRecommendation: 'auto_pass' | 'human_review'
  }
  relations: {
    keyConnections: DistilledRelationConnection[]
    clusterRole: string | null
    coordinationSignals: string[]
  }
  memoryDrafts: DistilledMemoryDraft[]
  metadata: {
    sampledPosts: number
    sampledComments: number
    sampledReposts: number
    windowDays: number
    model: string
    promptVersion: string
    generatedAt: string
    extractorVersion?: string
    aggregationVersion?: string
    eventWindowCount?: number
    coordinationSignalCount?: number
    warnings?: string[]
  }
}

export interface DistillationTaskProgress {
  stage: 'queued' | 'crawling' | 'extracting' | 'aggregating' | 'publishing'
  partial: boolean
  latestMessage: string
  lastProgressAt: string | null
  counters: {
    crawledPosts: number
    reusedExtractions: number
    extractedPosts: number
    failedPosts: number
    eventClusterCount: number
    coordinationSignalCount: number
    warningCount: number
  }
  coverage: {
    latestPostAt: string | null
    oldestPostAt: string | null
  }
  recentWarnings: string[]
}
