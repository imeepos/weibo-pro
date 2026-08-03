/**
 * 工作流 API 相关类型定义
 */

/** 触发 NLP 分析请求 */
export interface TriggerNLPRequest {
  postId: string
}

/** 爬取帖子请求 */
export interface CrawlPostRequest {
  postId: string
}

/** 爬取帖子响应数据 */
export interface CrawlPostData {
  postId: string
  mid: string
  uid: string
  commentsCount: number
  repostsCount: number
  commentsCrawled: boolean
  repostsCrawled: boolean
}

/** 批量触发 NLP 分析请求 */
export interface BatchNLPRequest {
  postIds: string[]
}

/** 微博关键词搜索请求 */
export interface WeiboSearchRequest {
  keyword: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  page?: number
}

/** 工作流状态响应 */
export interface WorkflowStatusResponse {
  nlpQueue: 'active' | 'inactive' | 'error'
  workflowEngine: 'running' | 'stopped' | 'error'
  lastExecution?: string // ISO 8601 时间戳
  queueDepth?: number
}

/** API 响应包装 */
export interface WorkflowApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  timestamp?: string
}
