import { Controller, Get, Query } from '@sker/core'

/**
 * 待 NLP 处理的帖子（精简版）
 */
export interface PendingNLPPost {
  id: string
  event_id: string | null
  ingested_at: string
}

/**
 * 获取待 NLP 处理帖子的响应
 */
export interface GetPendingNLPPostsResponse {
  posts: PendingNLPPost[]
  hasMore: boolean
  cursor: string | null
}

@Controller('posts')
export class PostsController {
  /**
   * 获取待 NLP 处理的帖子列表
   * 用于浏览器端工作流执行器
   */
  @Get('pending-nlp')
  getPendingNLPPosts(
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: number
  ): Promise<GetPendingNLPPostsResponse> {
    throw new Error('method getPendingNLPPosts not implements')
  }
}
