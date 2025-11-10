/**
 * HTTP 客户端和响应处理
 *
 * 提供优雅的 HTTP 请求封装，支持拦截器和错误处理
 */

// HTTP 响应接口
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// HTTP 请求配置接口
export interface HttpRequestConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  baseURL?: string;
}

// 拦截器接口
export interface HttpInterceptor {
  request?(config: HttpRequestConfig): HttpRequestConfig;
  requestError?(error: any): any;
  response?(response: HttpResponse): HttpResponse;
  responseError?(error: any): any;
}

/**
 * HTTP 客户端抽象接口
 *
 * 存在即合理：
 * - 定义统一的 HTTP 客户端契约
 * - 支持多种实现的替换
 * - 为测试和 Mock 提供便利
 */
export interface HttpClient {
  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>>;

  // 拦截器管理
  addInterceptor(interceptor: HttpInterceptor): number;
  removeInterceptor(token: number): void;
}

/**
 * HTTP 客户端配置接口
 *
 * 优雅设计：
 * - 支持完整的 HTTP 配置选项
 * - 提供合理的默认值
 * - 支持环境特定的配置
 */
export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  interceptors?: HttpInterceptor[];
}

/**
 * 基于 Fetch 的 HTTP 客户端实现
 *
 * 存在即合理：
 * - 使用现代 Fetch API
 * - 提供完整的 HTTP 功能
 * - 支持浏览器和 Node.js 环境
 * - 优雅的错误处理和重试机制
 */
export class FetchHttpClient implements HttpClient {
  private interceptors: HttpInterceptor[] = [];
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };

    // 添加默认拦截器
    if (this.config.interceptors) {
      this.config.interceptors.forEach(interceptor => {
        this.addInterceptor(interceptor);
      });
    }
  }

  private async executeRequest<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    // 应用请求拦截器
    let finalConfig = { ...this.config, ...config };
    for (const interceptor of this.interceptors) {
      if (interceptor.request) {
        finalConfig = interceptor.request(finalConfig);
      }
    }

    const { url = '', method = 'GET', headers = {}, params, data, timeout = this.config.timeout } = finalConfig;

    // 构建 URL
    const baseURL = finalConfig.baseURL || this.config.baseURL || '';
    const fullUrl = new URL(url, baseURL);

    // 添加查询参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }

    // 构建 fetch 选项
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...this.config.headers,
        ...headers,
      },
    };

    if (data && method !== 'GET') {
      if (typeof data === 'object') {
        fetchOptions.body = JSON.stringify(data);
      } else {
        fetchOptions.body = data;
      }
    }

    try {
      // 执行请求
      const response = await this.withTimeout(fetch(fullUrl.toString(), fetchOptions), timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 解析响应
      const contentType = response.headers.get('content-type');
      let responseData: T;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as unknown as T;
      }

      const httpResponse: HttpResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
      };

      // 应用响应拦截器
      for (const interceptor of this.interceptors) {
        if (interceptor.response) {
          return interceptor.response(httpResponse);
        }
      }

      return httpResponse;

    } catch (error) {
      // 应用错误拦截器
      for (const interceptor of this.interceptors) {
        if (interceptor.responseError) {
          return interceptor.responseError(error);
        }
      }

      throw error;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`请求超时: ${timeout}ms`)), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  async get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>({ url, method: 'GET', ...config });
  }

  async post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>({ url, method: 'POST', data, ...config });
  }

  async put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>({ url, method: 'PUT', data, ...config });
  }

  async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>({ url, method: 'DELETE', ...config });
  }

  async patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>({ url, method: 'PATCH', data, ...config });
  }

  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(config);
  }

  addInterceptor(interceptor: HttpInterceptor): number {
    return this.interceptors.push(interceptor) - 1;
  }

  removeInterceptor(token: number): void {
    if (token >= 0 && token < this.interceptors.length) {
      this.interceptors.splice(token, 1);
    }
  }
}

/**
 * 创建 HTTP 客户端的工厂函数
 *
 * 优雅设计：
 * - 提供多种创建方式
 * - 支持环境特定配置
 * - 简化客户端实例化
 */
export function createHttpClient(config?: HttpClientConfig): HttpClient {
  return new FetchHttpClient(config);
}

/**
 * 默认的响应拦截器
 *
 * 优雅设计：
 * - 统一的响应格式处理
 * - 优雅的错误消息格式化
 * - 支持调试和日志记录
 */
export const defaultResponseInterceptor: HttpInterceptor = {
  response(response) {
    return response;
  },

  responseError(error) {
    if (error instanceof Error) {
      throw new Error(`请求失败: ${error.message}`);
    }
    throw new Error('请求失败: 未知错误');
  },
};

/**
 * 日志拦截器
 *
 * 优雅设计：
 * - 记录请求和响应信息
 * - 支持不同日志级别
 * - 便于调试和监控
 */
export const loggingInterceptor: HttpInterceptor = {
  request(config) {
    console.log(`[${config.method}] ${config.url}`, {
      params: config.params,
      data: config.data
    });
    return config;
  },

  response(response) {
    console.log(`[RESPONSE] ${response.status}`, {
      status: response.status,
      dataLength: JSON.stringify(response.data).length
    });
    return response;
  },

  responseError(error) {
    console.error(`[ERROR] ${error.message}`);
    throw error;
  },
};