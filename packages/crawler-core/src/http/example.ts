import { HttpClient, SignatureProvider } from './index';
import type { InternalAxiosRequestConfig } from 'axios';

// 基础使用示例
async function basicExample() {
  const client = new HttpClient({
    baseURL: 'https://api.example.com',
    timeout: 30000,
    enableCookies: true,
    enableLogging: true,
  });

  const response = await client.get('/users');
  console.log(response.data);
}

// 代理配置示例
async function proxyExample() {
  const client = new HttpClient({
    proxy: {
      protocol: 'socks5',
      host: '127.0.0.1',
      port: 1080,
    },
  });

  await client.get('https://example.com');
}

// Cookie 持久化示例
async function cookieExample() {
  const client = new HttpClient({ enableCookies: true });

  await client.get('https://example.com/login');
  const cookies = await client.saveCookies();

  const newClient = new HttpClient({ enableCookies: true });
  if (cookies) {
    await newClient.loadCookies(cookies);
  }
}

// 请求签名示例
class WeiboSignature implements SignatureProvider {
  sign(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const timestamp = Date.now();
    config.headers['X-Timestamp'] = timestamp.toString();
    config.headers['X-Signature'] = this.generateSignature(config, timestamp);
    return config;
  }

  private generateSignature(config: InternalAxiosRequestConfig, timestamp: number): string {
    return `signature_${timestamp}`;
  }
}

async function signatureExample() {
  const client = new HttpClient();
  client.setSignatureProvider(new WeiboSignature());

  await client.get('/api/data');
}

// 拦截器示例
async function interceptorExample() {
  const client = new HttpClient();

  client.addRequestInterceptor({
    onRequest: (config) => {
      config.headers['User-Agent'] = 'Custom UA';
      return config;
    },
  });

  client.addResponseInterceptor({
    onResponse: (response) => {
      console.log('Response received:', response.status);
      return response;
    },
  });

  await client.get('/api/data');
}
