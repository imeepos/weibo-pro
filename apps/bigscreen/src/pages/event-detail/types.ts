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
  UserRelationNetwork,
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
  timeline: Array<{ time: string; event: string; type: string; impact: number; description: string; metrics: { posts: number; users: number; sentiment: number; } }>;
  propagationPath: Array<{ userType: string; userCount: number; postCount: number; influence: number; }>;
  keyNodes: Array<{ time: string; description: string; impact: 'high' | 'medium' | 'low'; metrics: { posts: number; users: number; sentiment: number; }; }>;
  developmentPhases: Array<{ phase: string; timeRange: string; description: string; keyEvents: string[]; keyTasks: string[]; keyMeasures: string[]; metrics: { hotness: number; posts: number; users: number; sentiment: number; }; status: 'completed' | 'ongoing' | 'planned'; }>;
  developmentPattern?: { outbreakSpeed: string; propagationScope: string; duration: string; impactDepth: string; };
  successFactors?: Array<{ title: string; description: string; }>;
}

export type TrendWidgets = {
  spreadBreadth: AnalysisWidgetState<SpreadBreadthAnalysis>;
  mediaType: AnalysisWidgetState<MediaTypeAnalysis>;
  anomalies: AnalysisWidgetState<EventAnomaly[]>;
};

export type SentimentWidgets = {
  transition: AnalysisWidgetState<{ eventId: string }>;
  scatter: AnalysisWidgetState<Array<{ postId: string; sentimentScore: number; hotness: number; timestamp: string }>>;
  intensity: AnalysisWidgetState<Array<{ intensity: number; count: number }>>;
  emotionMap: AnalysisWidgetState<EventEmotionMapItem[]>;
  userInsights: AnalysisWidgetState<EventUserEmotionInsight[]>;
  detailedTrend: AnalysisWidgetState<EventSentimentTrendDetailedPoint[]>;
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
  topicOverview: AnalysisWidgetState<EventTopicOverview>;
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

export interface EventTopicOverview {
  topTopics: Array<{
    title: string;
    count: number;
    sentiment: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  timeSeries: Array<{
    keyword: string;
    timeData: Array<{
      timestamp: string;
      weight: number;
    }>;
  }>;
}

export type EventsControllerPhase2 = {
  getEventMilestones: (id: string) => Promise<EventMilestone[]>;
  getEventTopicOverview: (id: string) => Promise<EventTopicOverview>;
  getEventInstitutions: (id: string) => Promise<EventInstitutionAccount[]>;
};

export type EventsControllerPhase3 = {
  getEventOpinionClusters: (id: string) => Promise<EventOpinionCluster[]>;
  getEventEmotionMap: (id: string) => Promise<EventEmotionMapItem[]>;
  getEventUserEmotionInsights: (id: string) => Promise<EventUserEmotionInsight[]>;
  getEventSentimentTrendDetailed: (id: string) => Promise<EventSentimentTrendDetailedPoint[]>;
};

export type EventsControllerPhase4 = {
  getEventRiskProfile: (id: string) => Promise<EventUserRiskProfile>;
  getEventAbnormalUsers: (id: string) => Promise<EventAbnormalUser[]>;
};
