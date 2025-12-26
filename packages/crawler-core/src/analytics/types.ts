export interface SentimentResult {
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
  positive_prob: number;
  negative_prob: number;
  neutral_prob: number;
}

export interface KeywordResult {
  keyword: string;
  weight: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  pos: string;
  count: number;
}

export interface TrendPoint {
  timestamp: Date;
  value: number;
}

export interface UserProfile {
  totalPosts: number;
  totalComments: number;
  totalReposts: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topKeywords: KeywordResult[];
}

export interface PropagationNode {
  userId: string;
  username: string;
  timestamp: Date;
  type: 'original' | 'repost' | 'comment';
  children: PropagationNode[];
}
