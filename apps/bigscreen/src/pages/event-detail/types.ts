import type {
  EventAbnormalUser,
  EventAnomaly,
  EventOpinionCluster,
  EventUserRiskProfile,
  MediaTypeAnalysis,
  SpreadBreadthAnalysis,
} from '@sker/sdk';
import type { AnalysisWidgetState } from '@/types/analysis-widget';

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

export interface TrendChartData {
  hotnessData: number[];
  sentimentData: number[];
  postData: number[];
  userData: number[];
  totalPosts?: number;
}

export interface GeographicDataPoint {
  region: string;
  count: number;
  percentage: number;
  posts: number;
  sentiment: number;
}

export interface EventDetailData {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: { positive: number; negative: number; neutral: number; };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
}

export type TrendWidgets = {
  spreadBreadth: AnalysisWidgetState<SpreadBreadthAnalysis>;
  mediaType: AnalysisWidgetState<MediaTypeAnalysis>;
  anomalies: AnalysisWidgetState<EventAnomaly[]>;
};

export type SentimentWidgets = {
  scatter: AnalysisWidgetState<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>;
};

export type OpinionWidgets = {
  clusters: AnalysisWidgetState<EventOpinionCluster[]>;
};

export type UserAnalysisWidgets = {
  riskProfile: AnalysisWidgetState<EventUserRiskProfile>;
  abnormalUsers: AnalysisWidgetState<EventAbnormalUser[]>;
};

export type OverviewWidgets = {
  milestones: AnalysisWidgetState<EventMilestone[]>;
  institutions: AnalysisWidgetState<EventInstitutionAccount[]>;
};

export interface EventMilestone {
  timestamp: string;
  type: 'heat_spike' | 'sentiment_turn' | 'propagation_peak' | 'official_response' | 'discussion_shift';
  title: string;
  summary: string;
  confidence: number;
  metrics: {
    hotness?: number;
    postCount?: number;
    userCount?: number;
    sentimentShift?: number;
  };
  representativePosts: Array<{
    postId: string;
    author: string;
    excerpt: string;
    engagement: number;
  }>;
}

export interface EventInstitutionAccount {
  userId: string;
  screenName: string;
  avatar?: string;
  institutionType: 'government' | 'state_media' | 'enterprise_org' | 'official_other';
  verified: boolean;
  verifiedType?: string;
  postCount: number;
  interactionCount: number;
  influenceScore: number;
  sentimentTilt: 'positive' | 'negative' | 'neutral';
}

export type EventsControllerPhase2 = {
  getEventMilestones: (id: string) => Promise<EventMilestone[]>;
  getEventInstitutions: (id: string) => Promise<EventInstitutionAccount[]>;
};

export type EventsControllerPhase3 = {
  getEventOpinionClusters: (id: string) => Promise<EventOpinionCluster[]>;
};

export type EventsControllerPhase4 = {
  getEventRiskProfile: (id: string) => Promise<EventUserRiskProfile>;
  getEventAbnormalUsers: (id: string) => Promise<EventAbnormalUser[]>;
};
