export interface BaiduAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  session_key?: string;
  session_secret?: string;
}

export interface SentimentResult {
  text: string;
  items: Array<{
    positive_prob: number;
    confidence: number;
    negative_prob: number;
    sentiment: 0 | 1 | 2;
  }>;
  log_id: number;
}

export interface BaiduNLPConfig {
  apiKey: string;
  secretKey: string;
}
