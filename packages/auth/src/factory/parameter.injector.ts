/**
 * Parameter Injection for Controller Methods
 */

import { ParamType } from '@sker/core';
import type { RouteParameter, RequestContext, ResponseController } from './factory.types';
import { extractFileFromRequest } from './file.handler';

/**
 * Inject parameters from request context into method arguments
 */
export async function injectParameters(
  argsMetadata: Record<string, RouteParameter>,
  ctx: RequestContext
): Promise<unknown[]> {
  const sortedMetadata = Object.values(argsMetadata).sort((a, b) => a.index - b.index);
  const results: unknown[] = [];

  for (const metadata of sortedMetadata) {
    const { type, key: fieldKey, zod } = metadata;

    switch (type) {
      case ParamType.BODY: {
        const bodyValue = fieldKey ? (ctx.body as Record<string, unknown>)[fieldKey] : ctx.body;
        results.push(zod ? zod.parse(bodyValue) : bodyValue);
        break;
      }

      case ParamType.SESSION:
        results.push(ctx.context.session);
        break;

      case ParamType.QUERY: {
        const queryValue = fieldKey ? (ctx.query as Record<string, unknown>)[fieldKey] : ctx.query;
        results.push(zod ? zod.parse(queryValue) : queryValue);
        break;
      }

      case ParamType.PARAM: {
        const paramValue = fieldKey ? (ctx.params as Record<string, unknown>)[fieldKey] : ctx.params;
        results.push(zod ? zod.parse(paramValue) : paramValue);
        break;
      }

      case ParamType.HEADER:
        results.push(fieldKey ? ctx.headers.get(fieldKey) : ctx.headers);
        break;

      case ParamType.REQ:
        results.push(ctx.request);
        break;

      case ParamType.RES: {
        // Return response controller object
        const responseController: ResponseController = {
          json: ctx.json,
          redirect: ctx.redirect,
          setHeader: ctx.setHeader,
          setStatus: ctx.setStatus,
          setCookie: ctx.setCookie,
        };
        results.push(responseController);
        break;
      }

      case ParamType.HEADERS: {
        // Return all headers as Record<string, string>
        const headersObj: Record<string, string> = {};
        if (ctx.headers) {
          ctx.headers.forEach((value, key) => {
            headersObj[key] = value;
          });
        }
        results.push(headersObj);
        break;
      }

      case ParamType.UPLOADED_FILE: {
        // Extract file from request FormData
        if (ctx.request) {
          const file = await extractFileFromRequest(ctx.request, fieldKey);
          results.push(file);
        } else {
          results.push(undefined);
        }
        break;
      }

      default:
        results.push(undefined);
    }
  }

  return results;
}
