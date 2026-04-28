import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeiboWorkerProxyService } from './weibo-worker-proxy.service';

describe('WeiboWorkerProxyService', () => {
  const originalFetch = global.fetch;
  const envBackup = {
    WEIBO_WORKER_PROXY_ENABLED: process.env.WEIBO_WORKER_PROXY_ENABLED,
    WEIBO_PROXY_MAX_RETRIES: process.env.WEIBO_PROXY_MAX_RETRIES,
    WEIBO_PROXY_RETRY_DELAY: process.env.WEIBO_PROXY_RETRY_DELAY,
  };

  beforeEach(() => {
    process.env.WEIBO_WORKER_PROXY_ENABLED = 'false';
    process.env.WEIBO_PROXY_MAX_RETRIES = '2';
    process.env.WEIBO_PROXY_RETRY_DELAY = '1';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();

    process.env.WEIBO_WORKER_PROXY_ENABLED = envBackup.WEIBO_WORKER_PROXY_ENABLED;
    process.env.WEIBO_PROXY_MAX_RETRIES = envBackup.WEIBO_PROXY_MAX_RETRIES;
    process.env.WEIBO_PROXY_RETRY_DELAY = envBackup.WEIBO_PROXY_RETRY_DELAY;
  });

  it('retries direct requests after a transient timeout', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed: ETIMEDOUT'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const service = new WeiboWorkerProxyService();
    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const response = await service.fetch('https://weibo.com/ajax/statuses/mymblog?uid=1&page=1&feature=0', {
      cookie: 'SUB=token',
      referer: 'https://weibo.com/u/1',
      'user-agent': 'Mozilla/5.0',
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries direct requests when undici stores the timeout code on error cause', async () => {
    const timeoutError = new TypeError('fetch failed');
    Object.assign(timeoutError, {
      cause: {
        code: 'UND_ERR_CONNECT_TIMEOUT',
        message: 'Connect Timeout Error',
      },
    });

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const service = new WeiboWorkerProxyService();
    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const response = await service.fetch('https://weibo.com/ajax/statuses/mymblog?uid=1&page=1&feature=0', {
      cookie: 'SUB=token',
      referer: 'https://weibo.com/u/1',
      'user-agent': 'Mozilla/5.0',
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries direct requests when fetch only reports fetch failed', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const service = new WeiboWorkerProxyService();
    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const response = await service.fetch('https://weibo.com/ajax/statuses/mymblog?uid=1&page=1&feature=0', {
      cookie: 'SUB=token',
      referer: 'https://weibo.com/u/1',
      'user-agent': 'Mozilla/5.0',
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
