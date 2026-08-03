import { ParamType, RequestMethod } from '@sker/core';

export function buildFullPath(controllerPrefix: string, methodPath: string): string {
  if (!controllerPrefix) return methodPath;
  if (!methodPath || methodPath === '/') return controllerPrefix;

  const normalizedPrefix = controllerPrefix.startsWith('/') ? controllerPrefix : `/${controllerPrefix}`;
  const normalizedPath = methodPath.startsWith('/') ? methodPath : `/${methodPath}`;

  return `${normalizedPrefix}${normalizedPath}`;
}

export function extractParameters(args: any[], routeArgs: Record<string, any>) {
  const urlParams: Record<string, any> = {};
  const queryParams: Record<string, any> = {};
  let bodyData: any = undefined;

  for (const [, metadata] of Object.entries(routeArgs)) {
    const { index, type, key: paramKey } = metadata;
    const value = args[index];

    if (value === undefined) continue;

    switch (type) {
      case ParamType.PARAM:
        if (paramKey) urlParams[paramKey] = value;
        break;
      case ParamType.QUERY:
        if (paramKey) queryParams[paramKey] = value;
        else Object.assign(queryParams, value);
        break;
      case ParamType.BODY:
        if (paramKey) {
          bodyData = bodyData || {};
          bodyData[paramKey] = value;
        } else {
          bodyData = value;
        }
        break;
    }
  }

  return { urlParams, queryParams, bodyData };
}

export function replaceUrlParams(url: string, params: Record<string, any>): string {
  return url.replace(/:([^/]+)/g, (match, paramName) => {
    return params[paramName] !== undefined ? String(params[paramName]) : match;
  });
}

export function getHttpMethodString(method: RequestMethod): string {
  const map: Record<RequestMethod, string> = {
    [RequestMethod.GET]: 'GET',
    [RequestMethod.POST]: 'POST',
    [RequestMethod.PUT]: 'PUT',
    [RequestMethod.DELETE]: 'DELETE',
    [RequestMethod.PATCH]: 'PATCH',
  };
  return map[method] || 'GET';
}
