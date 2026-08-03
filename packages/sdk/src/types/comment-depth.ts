/**
 * 评论深度分析数据
 */
export interface CommentDepthDistribution {
  depth: number
  count: number
  percentage: number
}

export interface DiscussionHotspot {
  rootCommentId: string
  rootCommentText: string
  replyCount: number
  maxDepth: number
  participants: number
}

export interface CommentDepthAnalysis {
  avgThreadDepth: number
  maxThreadDepth: number
  replyRatio: number
  totalRootComments: number
  totalReplies: number
  depthDistribution: CommentDepthDistribution[]
  discussionHotspots: DiscussionHotspot[]
}
