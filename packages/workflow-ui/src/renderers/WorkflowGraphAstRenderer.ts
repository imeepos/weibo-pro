import { Render } from '@sker/workflow'
import { WorkflowGraphAst } from '@sker/workflow'

/**
 * WorkflowGraphAst 渲染器
 *
 * 优雅设计：
 * - 使用 @Render 装饰器注册前端渲染器
 * - 确保 WorkflowGraphAst 在节点面板中可见
 * - 为子工作流容器提供专门的渲染支持
 */
@Render(WorkflowGraphAst)
export class WorkflowGraphAstRenderer {
  /**
   * 获取节点显示标签
   */
  getLabel(): string {
    return '工作流容器'
  }

  /**
   * 获取节点描述
   */
  getDescription(): string {
    return '创建一个包含子工作流的容器节点'
  }

  /**
   * 获取节点图标
   */
  getIcon(): string {
    return '📦'
  }

  /**
   * 获取节点分类
   */
  getCategory(): string {
    return '容器'
  }
}