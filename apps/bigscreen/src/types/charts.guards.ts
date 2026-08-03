/**
 * 图表类型守卫函数
 */

import type { EChartsParams, TimeSeriesDataPoint } from './charts.types';

/**
 * 检查是否为有效的ECharts参数
 */
export function isValidEChartsParams(obj: unknown): obj is EChartsParams {
  if (!obj || typeof obj !== 'object') return false;

  const params = obj as Record<string, unknown>;

  return (
    typeof params.seriesIndex === 'number' &&
    typeof params.dataIndex === 'number' &&
    (typeof params.value === 'number' || typeof params.value === 'string') &&
    typeof params.name === 'string'
  );
}

/**
 * 检查是否为有效的时间序列数据
 */
export function isValidTimeSeriesData(obj: unknown): obj is TimeSeriesDataPoint {
  if (!obj || typeof obj !== 'object') return false;

  const data = obj as Record<string, unknown>;

  return (
    typeof data.timestamp === 'string' &&
    typeof data.value === 'number'
  );
}
