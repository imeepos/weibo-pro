import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 标准 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp?: string;
}

/**
 * 响应拦截器：统一格式化所有 API 响应
 *
 * 将控制器返回的裸数据包装为标准格式：
 * { success: true, data: <原始数据>, timestamp: <ISO时间戳> }
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}
