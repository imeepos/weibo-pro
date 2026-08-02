import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export interface HttpProxyConfig {
  protocol: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  proxy?: HttpProxyConfig;
  retry?: Partial<RetryConfig>;
  enableCookies?: boolean;
  enableLogging?: boolean;
}

export interface RequestInterceptor {
  onRequest?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  onRequestError?: (error: any) => any;
}

export interface ResponseInterceptor {
  onResponse?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  onResponseError?: (error: any) => any;
}

export interface SignatureProvider {
  sign(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> | InternalAxiosRequestConfig;
}
