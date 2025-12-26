import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { CookieJar } from './cookie-jar';
import { RetryHandler } from './retry';
import type {
  HttpClientConfig,
  HttpProxyConfig,
  RequestInterceptor,
  ResponseInterceptor,
  SignatureProvider,
} from './types';

export class HttpClient {
  private client: AxiosInstance;
  private cookieJar?: CookieJar;
  private retryHandler: RetryHandler;
  private signatureProvider?: SignatureProvider;
  private enableLogging: boolean;

  constructor(config: HttpClientConfig = {}) {
    this.enableLogging = config.enableLogging ?? false;
    this.retryHandler = new RetryHandler(config.retry);

    if (config.enableCookies) {
      this.cookieJar = new CookieJar();
    }

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: config.headers,
      ...this.buildProxyConfig(config.proxy),
    });

    this.setupInterceptors();
  }

  private buildProxyConfig(proxy?: HttpProxyConfig) {
    if (!proxy) return {};

    if (proxy.protocol === 'socks5') {
      const auth = proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}@` : '';
      const proxyUrl = `socks5://${auth}${proxy.host}:${proxy.port}`;
      return {
        httpAgent: new SocksProxyAgent(proxyUrl),
        httpsAgent: new SocksProxyAgent(proxyUrl),
      };
    }

    return {
      proxy: {
        protocol: proxy.protocol,
        host: proxy.host,
        port: proxy.port,
        auth: proxy.auth,
      },
    };
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        if (this.enableLogging) {
          const method = config.method ? config.method.toUpperCase() : 'GET';
          console.log(`[HTTP] ${method} ${config.url}`);
        }

        if (this.cookieJar && config.url) {
          const cookieString = await this.cookieJar.getCookieString(config.url);
          if (cookieString) {
            config.headers.Cookie = cookieString;
          }
        }

        if (this.signatureProvider) {
          config = await this.signatureProvider.sign(config);
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      async (response) => {
        if (this.cookieJar && response.config.url) {
          const setCookies = response.headers['set-cookie'];
          if (setCookies) {
            for (const cookie of setCookies) {
              await this.cookieJar.setCookie(cookie, response.config.url);
            }
          }
        }

        if (this.enableLogging) {
          console.log(`[HTTP] ${response.status} ${response.config.url}`);
        }

        return response;
      },
      async (error) => {
        if (this.enableLogging) {
          console.error(`[HTTP] Error: ${error.message}`);
        }

        return this.retryHandler.executeWithRetry(
          () => this.client.request(error.config),
          error.config
        );
      }
    );
  }

  setSignatureProvider(provider: SignatureProvider) {
    this.signatureProvider = provider;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.client.interceptors.request.use(
      interceptor.onRequest,
      interceptor.onRequestError
    );
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.client.interceptors.response.use(
      interceptor.onResponse,
      interceptor.onResponseError
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.request<T>(config);
  }

  getCookieJar(): CookieJar | undefined {
    return this.cookieJar;
  }

  async saveCookies(): Promise<string | undefined> {
    return this.cookieJar?.serialize();
  }

  async loadCookies(data: string): Promise<void> {
    if (this.cookieJar) {
      this.cookieJar = CookieJar.deserialize(data);
    }
  }
}
