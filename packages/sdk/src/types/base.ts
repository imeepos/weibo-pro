/**
 * 基础共享类型
 *
 * 被多个业务域(事件、用户、调查、Persona、Crawler、SSE 等)共同引用的基础类型。
 * 单独抽离以避免域文件之间产生循环依赖。
 */

export type TimeRange = 'all' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d'

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}

export type RiskLevel = 'low' | 'medium' | 'high'

export type MediaPlatform = 'xhs' | 'dy' | 'ks' | 'bili' | 'wb' | 'tieba' | 'zhihu'

export type MemoryType = 'fact' | 'concept' | 'event' | 'person' | 'insight'
export type RelationType = 'related' | 'causes' | 'follows' | 'contains'

export type DistilledMemorySection = 'identity' | 'behavior' | 'content' | 'risk' | 'relations'
export type DistilledMemoryStability = 'stable' | 'tentative' | 'conflicted'
