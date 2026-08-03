import { Observable } from 'rxjs';
import { clone } from '@sker/workflow';
import { BETTER_OPTIONS } from './tokens';
import { root } from '@sker/core';

/**
 * 创建 POST SSE Observable
 */
export function createPostSSEObservable<T>(url: string, queryParams: any, bodyData: any): Observable<T> {
  return new Observable<T>(subscriber => {
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    // 获取 baseURL
    const options = root.get(BETTER_OPTIONS);
    const baseURL = options?.baseURL || '';

    // 拼接完整 URL
    let fullUrl = baseURL ? `${baseURL}${url}` : url;

    // 构建带 query 参数的 URL
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      fullUrl = queryString ? `${fullUrl}?${queryString}` : fullUrl;
    }

    // 使用原生 fetch，因为 better-fetch 会自动读取 body 导致 stream 被锁定
    fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(clone(bodyData)),
      signal: abortController.signal,
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is not readable');
        }

        reader = response.body.getReader();

        const decoder = new TextDecoder();
        let buffer = '';

        function read() {
          reader!.read().then(({ done, value }) => {
            if (done) {
              subscriber.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine === '' || trimmedLine.startsWith(':')) continue;

              if (trimmedLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  subscriber.next(data);
                } catch (error) {
                  console.warn('[SSE] JSON 解析失败:', trimmedLine.slice(0, 100), error);
                }
              }
            }

            read();
          }).catch(error => {
            if (error.name === 'AbortError') {
              subscriber.complete();
            } else {
              bodyData.state = 'fail';
              subscriber.next({ ...bodyData } as T);
              subscriber.complete();
            }
          });
        }

        read();
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          subscriber.error(error);
        } else {
          subscriber.complete();
        }
      });

    return () => {
      abortController.abort();
      reader?.cancel().catch(() => { });
    };
  });
}
