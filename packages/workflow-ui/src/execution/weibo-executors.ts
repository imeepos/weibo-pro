import { Ast } from '@sker/workflow'
import { FrontendExecutor, FrontendExecutorContext } from './frontend-executor'
import { BaseGenericExecutor } from './generic-executor'

/**
 * 微博关键词搜索执行器
 */
export class WeiboKeywordSearchExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '微博关键词搜索执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboKeywordSearchAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'searchWeibo'
  }
}

/**
 * 微博帖子详情执行器
 */
export class WeiboAjaxStatusesShowExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '微博帖子详情执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxStatusesShowAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlPost'
  }
}

/**
 * 微博评论执行器
 */
export class WeiboAjaxStatusesCommentExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '微博评论执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxStatusesCommentAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlComments'
  }
}

/**
 * 微博转发执行器
 */
export class WeiboAjaxStatusesRepostTimelineExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '微博转发执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxStatusesRepostTimelineAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlReposts'
  }
}

/**
 * 微博点赞执行器
 */
export class WeiboAjaxStatusesLikeShowExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '微博点赞执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxStatusesLikeShowAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlLikes'
  }
}

/**
 * 个人博文执行器
 */
export class WeiboAjaxStatusesMymblogExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '个人博文执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxStatusesMymblogAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlUserPosts'
  }
}

/**
 * 用户信息执行器
 */
export class WeiboAjaxProfileInfoExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '用户信息执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxProfileInfoAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlUserProfile'
  }
}

/**
 * 关注列表执行器
 */
export class WeiboAjaxFriendshipsExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '关注列表执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxFriendshipsAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlFollowers'
  }
}

/**
 * 热门微博执行器
 */
export class WeiboAjaxFeedHotTimelineExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '热门微博执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxFeedHotTimelineAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'crawlHotTimeline'
  }
}

/**
 * 微博登录执行器 - 特殊SSE处理
 * 复用现有的WeiboLoginExecutor
 */
export { WeiboLoginExecutor } from './special-executors'