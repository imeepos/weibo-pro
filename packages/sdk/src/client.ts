import { CONTROLLES, Provider, root, PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA, RequestMethod, ParamType } from "@sker/core";
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { AXIOS, AXIOS_CONFIG } from "./tokens";

export const providers: () => Provider[] = () => {
    const controllers = root.get(CONTROLLES, [])

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
            useValue: {
                baseURL: '/api'
            }
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
                const finalUrl = replaceUrlParams(fullPath, urlParams);

                // 构建请求配置
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
                    return response.data;
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
        default: return 'GET';
    }
}