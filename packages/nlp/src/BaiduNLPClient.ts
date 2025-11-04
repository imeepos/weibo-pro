import { Injectable } from '@sker/core';
import axios, { type AxiosInstance } from 'axios';
import type { BaiduAccessTokenResponse, SentimentResult, BaiduNLPConfig } from './types';

@Injectable({
  useFactory: () => {
    return new BaiduNLPClient(nlpConfigFactory());
  },
  deps: []
})
export class BaiduNLPClient {
  private readonly httpClient: AxiosInstance;
  private readonly tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
  private readonly sentimentUrl = 'https://aip.baidubce.com/rpc/2.0/nlp/v1/sentiment_classify';

  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly config: BaiduNLPConfig) {
    this.httpClient = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  private async ensureAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await this.httpClient.post<BaiduAccessTokenResponse>(
      this.tokenUrl,
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.secretKey
        }
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = now + (response.data.expires_in * 1000) - 60000;

    return this.accessToken;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const token = await this.ensureAccessToken();

    const response = await this.httpClient.post<SentimentResult>(
      this.sentimentUrl,
      { text },
      {
        params: {
          charset: 'UTF-8',
          access_token: token
        }
      }
    );

    return response.data;
  }
}

export const nlpConfigFactory = (): BaiduNLPConfig => {
  const apiKey = process.env.BAIDU_NLP_API_KEY;
  const secretKey = process.env.BAIDU_NLP_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('BAIDU_NLP_API_KEY and BAIDU_NLP_SECRET_KEY must be set');
  }

  return { apiKey, secretKey };
};
