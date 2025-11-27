import { CONTROLLES, Provider, root, PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA, RequestMethod, ParamType } from "@sker/core";
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { AXIOS, AXIOS_CONFIG } from "./tokens";
import { Observable } from 'rxjs';

export const providers: (config?: AxiosRequestConfig) => Provider[] = (config = { baseURL: '/' }) => {
    const controllers = root.get(CONTROLLES, [])
    console.log(`@sker/sdk`,{ config })
    return [
        {
            provide: AXIOS,
            useFactory: (config: AxiosRequestConfig) => {
                return axios.create(config)
            },
            deps: [AXIOS_CONFIG]
        },
        {
            provide: AXIOS_CONFIG,
            useValue: config
        },
        ...controllers.map(controller => {
            return {
                provide: controller,
                useFactory: (axiosInstance: AxiosInstance) => {
                    return createControllerInstance(controller, axiosInstance);
                },
                deps: [AXIOS]
            } as Provider
        })
    ]
}

function createControllerInstance<T>(controllerClass: new () => T, axiosInstance: AxiosInstance): T {
    const instance = Object.create(controllerClass.prototype);

    // 获取控制器前缀
    const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';

    // 获取所有方法
    const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
        name => name !== 'constructor'
    );

    for (const methodName of methodNames) {
        const originalMethod = controllerClass.prototype[methodName];

        // 获取方法元数据
        const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
        const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
        const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, originalMethod) || {};

        if (httpMethod !== undefined) {
            // 创建代理方法
            instance[methodName] = async function (...args: any[]) {
                // 构建完整URL
                const fullPath = buildFullPath(controllerPrefix, methodPath);

                // 提取参数
                const { urlParams, queryParams, bodyData, headers } = extractParameters(args, routeArgs);

                // 替换URL中的参数
                let finalUrl = replaceUrlParams(fullPath, urlParams);

                const axiosConfig = root.get(AXIOS_CONFIG, {})

                if (axiosConfig && axiosConfig.baseURL) {
                    // 确保 finalUrl 有前导斜杠
                    if (!finalUrl.startsWith('/')) {
                        finalUrl = '/' + finalUrl;
                    }
                    finalUrl = axiosConfig.baseURL + finalUrl
                }
                // SSE 方法特殊处理
                if (httpMethod === RequestMethod.SSE) {
                    // 检查是否有 body 数据，如果有则使用 POST SSE，否则使用 GET SSE
                    if (bodyData !== undefined) {
                        // POST SSE：支持复杂 JSON 传输
                        return new Observable<any>(subscriber => {
                            // 使用 fetch API 处理 POST SSE
                            fetch(finalUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'text/event-stream',
                                    'Cache-Control': 'no-cache'
                                },
                                body: JSON.stringify(bodyData)
                            })
                                .then(response => {
                                    const ok = response.ok;
                                    const status = response.status;
                                    if (!ok) {
                                        throw new Error(`HTTP error! status: ${status}`);
                                    }

                                    const reader = response.body?.getReader();
                                    if (!reader) {
                                        throw new Error('Response body is not readable');
                                    }

                                    const decoder = new TextDecoder();

                                    function read() {
                                        reader!.read().then(({ done, value }) => {
                                            if (done) {
                                                subscriber.complete();
                                                return;
                                            }

                                            const chunk = decoder.decode(value);
                                            const lines = chunk.split('\n');

                                            for (const line of lines) {
                                                if (line.startsWith('data: ')) {
                                                    try {
                                                        const data = JSON.parse(line.slice(6));
                                                        subscriber.next(data);
                                                    } catch (error) {
                                                        bodyData.state = 'fail'
                                                        subscriber.next({ ...bodyData })
                                                        subscriber.complete()
                                                    }
                                                }
                                            }

                                            read();
                                        }).catch(error => {
                                            bodyData.state = 'fail'
                                            subscriber.next({ ...bodyData })
                                            subscriber.complete()
                                        });
                                    }

                                    read();
                                })
                                .catch(error => {
                                    subscriber.error(error);
                                });

                            return () => {
                                // 清理函数
                            };
                        });
                    } else {
                        // GET SSE：传统 EventSource 方式
                        const sseUrl = buildSSEUrl(finalUrl, queryParams);

                        return new Observable<any>(subscriber => {
                            if (typeof window === 'undefined' || !window.EventSource) {
                                subscriber.error(new Error('EventSource is not available in this environment. Please use a compatible SSE library.'));
                                return;
                            }

                            const eventSource = new EventSource(sseUrl);

                            eventSource.onmessage = (event) => {
                                try {
                                    const data = JSON.parse(event.data);
                                    subscriber.next(data);
                                } catch (error) {
                                    subscriber.error(new Error(`Failed to parse SSE data: ${error}`));
                                }
                            };

                            eventSource.onerror = (error) => {
                                subscriber.error(error);
                            };

                            // 返回清理函数
                            return () => {
                                eventSource.close();
                            };
                        });
                    }
                }

                // 普通 HTTP 请求处理
                const config: AxiosRequestConfig = {
                    method: getHttpMethodString(httpMethod),
                    url: finalUrl,
                    params: queryParams,
                    data: bodyData,
                    headers
                };

                // 发送请求
                try {
                    const response = await axiosInstance.request(config);
                    const data = response.data;
                    if (data.success) return data.data;
                    throw new Error(`api error: ${JSON.stringify(data)}`)
                } catch (error) {
                    throw error;
                }
            };
        }
    }

    return instance;
}

function buildFullPath(controllerPrefix: string, methodPath: string): string {
    if (!controllerPrefix) return methodPath;
    if (!methodPath || methodPath === '/') return controllerPrefix;

    // 确保路径格式正确
    const normalizedPrefix = controllerPrefix.startsWith('/') ? controllerPrefix : `/${controllerPrefix}`;
    const normalizedPath = methodPath.startsWith('/') ? methodPath : `/${methodPath}`;

    return `${normalizedPrefix}${normalizedPath}`;
}

function extractParameters(args: any[], routeArgs: Record<string, any>) {
    const urlParams: Record<string, any> = {};
    const queryParams: Record<string, any> = {};
    let bodyData: any = undefined;
    const headers: Record<string, any> = {};

    for (const [key, metadata] of Object.entries(routeArgs)) {
        const { index, type, key: paramKey } = metadata;
        const value = args[index];

        if (value === undefined) continue;

        switch (type) {
            case ParamType.PARAM:
                if (paramKey) {
                    urlParams[paramKey] = value;
                }
                break;
            case ParamType.QUERY:
                if (paramKey) {
                    queryParams[paramKey] = value;
                } else {
                    // 如果没有指定key，假设是完整的查询对象
                    Object.assign(queryParams, value);
                }
                break;
            case ParamType.BODY:
                bodyData = value;
                break;
            case ParamType.HEADER:
                if (paramKey) {
                    headers[paramKey] = value;
                }
                break;
        }
    }

    return { urlParams, queryParams, bodyData, headers };
}

function replaceUrlParams(url: string, params: Record<string, any>): string {
    return url.replace(/:([^\/]+)/g, (match, paramName) => {
        return params[paramName] !== undefined ? String(params[paramName]) : match;
    });
}

function getHttpMethodString(method: RequestMethod): string {
    switch (method) {
        case RequestMethod.GET: return 'GET';
        case RequestMethod.POST: return 'POST';
        case RequestMethod.PUT: return 'PUT';
        case RequestMethod.DELETE: return 'DELETE';
        case RequestMethod.PATCH: return 'PATCH';
        case RequestMethod.SSE: return 'GET';  // SSE 使用 GET 方法
        default: return 'GET';
    }
}

/**
 * 构建 SSE URL
 */
function buildSSEUrl(baseUrl: string, queryParams: Record<string, any>): string {
    const params = new URLSearchParams();

    // 添加查询参数
    for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
            params.append(key, String(value));
        }
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}