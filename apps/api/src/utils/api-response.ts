import { Context } from 'hono'
import { AppError } from '@sker/core'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    timestamp: string
    details?: Record<string, unknown>
  }
  meta?: {
    timestamp: string
    requestId?: string
    path?: string
  }
}

export function success<T>(data: T, meta?: Omit<ApiResponse['meta'], 'timestamp'>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

export function error(
  err: Error | AppError | unknown,
  path?: string,
  method?: string
): ApiResponse {
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
        ...(err.meta && { details: err.meta }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path,
      },
    }
  }

  if (err instanceof Error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path,
      },
    }
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      path,
    },
  }
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<{ items: T[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }> {
  return success({
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

export async function handleResponse<T>(
  c: Context,
  promise: Promise<T> | T
): Promise<Response> {
  try {
    const data = await promise
    return c.json(success(data, { path: c.req.path }))
  } catch (err) {
    const errorResponse = error(err, c.req.path, c.req.method)
    const statusCode = err instanceof AppError ? (err.statusCode as any) : 500
    return c.json(errorResponse, statusCode as any)
  }
}
