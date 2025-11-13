import { Render } from '@sker/workflow'
import { WeiboLoginAst } from '@sker/workflow-ast'

/**
 * WeiboLoginAst 渲染器
 *
 * 优雅设计：
 * - 使用 @Render 装饰器注册前端渲染器
 * - 为微博登录节点提供专门的渲染支持
 * - 支持双击展开侧边栏配置表单
 * - 集成内联执行器功能
 */
@Render(WeiboLoginAst)
export class WeiboLoginAstRenderer {
  /**
   * 获取节点显示标签
   */
  getLabel(): string {
    return '微博登录'
  }

  /**
   * 获取节点描述
   */
  getDescription(): string {
    return '配置微博账号登录信息，获取登录会话'
  }

  /**
   * 获取节点图标
   */
  getIcon(): string {
    return '🔐'
  }

  /**
   * 获取节点分类
   */
  getCategory(): string {
    return '微博'
  }
}