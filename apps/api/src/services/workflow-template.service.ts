import { Injectable } from '@sker/core';
import { WorkflowGraphAst, generateId } from '@sker/workflow';
import {
  WeiboKeywordSearchAst,
  WeiboAjaxStatusesShowAst,
  WeiboAjaxStatusesCommentAst,
  WeiboAjaxStatusesRepostTimelineAst,
  WeiboAjaxStatusesLikeShowAst,
} from '@sker/workflow-ast';
import { IEdge } from '@sker/workflow';

/**
 * 工作流模板服务
 *
 * 存在即合理：
 * - 提供预定义的工作流模板
 * - 支持快速创建常用工作流
 * - 统一管理工作流配置
 */
@Injectable({ providedIn: 'root' })
export class WorkflowTemplateService {
  /**
   * 获取所有可用的模板
   */
  getAvailableTemplates(): string[] {
    return ['kindergarten-closure-event'];
  }

  /**
   * 根据模板名称创建工作流
   */
  createFromTemplate(templateName: string): WorkflowGraphAst | null {
    switch (templateName) {
      case 'kindergarten-closure-event':
        return this.createKindergartenClosureEventWorkflow();
      default:
        return null;
    }
  }

  /**
   * 创建幼儿园关停事件采集工作流
   *
   * 工作流说明：
   * 1. 使用关键词搜索微博帖子
   * 2. 遍历每个帖子
   * 3. 获取帖子详情
   * 4. 并行采集评论（含子评论）、转发、点赞
   */
  private createKindergartenClosureEventWorkflow(): WorkflowGraphAst {
    // 节点1: 微博关键词搜索
    const searchNode = new WeiboKeywordSearchAst();
    searchNode.id = 'search_node';
    searchNode.keyword = '关停2.11万所幼儿园';
    searchNode.startDate = new Date('2025-08-01');
    searchNode.endDate = new Date('2025-09-30');
    searchNode.page = 1;
    searchNode.position = { x: 100, y: 100 };

    // 用户可以在编辑器中进一步优化
    const showNode = new WeiboAjaxStatusesShowAst();
    showNode.id = 'show_node';
    showNode.position = { x: 400, y: 100 };

    // 节点3: 评论采集（含子评论）
    const commentNode = new WeiboAjaxStatusesCommentAst();
    commentNode.id = 'comment_node';
    commentNode.count = 20;
    commentNode.is_show_bulletin = 3;
    commentNode.is_mix = 0;
    commentNode.fetch_level = 0;
    commentNode.position = { x: 700, y: 50 };

    // 节点4: 转发采集
    const repostNode = new WeiboAjaxStatusesRepostTimelineAst();
    repostNode.id = 'repost_node';
    repostNode.page = 1;
    repostNode.position = { x: 700, y: 200 };

    // 节点5: 点赞采集
    const likeNode = new WeiboAjaxStatusesLikeShowAst();
    likeNode.id = 'like_node';
    likeNode.page = 1;
    likeNode.count = 20;
    likeNode.attitude_type = 0;
    likeNode.attitude_enable = 1;
    likeNode.position = { x: 700, y: 350 };

    // 创建边连接
    const edges: IEdge[] = [
      // 搜索 → 博文详情（items[0] 作为示例）
      {
        id: generateId(),
        from: searchNode.id,
        to: showNode.id,
        fromProperty: 'items',
        toProperty: 'mblogid',
      },

      // 博文详情 → 评论
      {
        id: generateId(),
        from: showNode.id,
        to: commentNode.id,
        fromProperty: 'mid',
        toProperty: 'mid',
      },
      {
        id: generateId(),
        from: showNode.id,
        to: commentNode.id,
        fromProperty: 'uid',
        toProperty: 'uid',
      },

      // 博文详情 → 转发
      {
        id: generateId(),
        from: showNode.id,
        to: repostNode.id,
        fromProperty: 'mid',
        toProperty: 'mid',
      },
      {
        id: generateId(),
        from: showNode.id,
        to: repostNode.id,
        fromProperty: 'uid',
        toProperty: 'uid',
      },

      // 博文详情 → 点赞
      {
        id: generateId(),
        from: showNode.id,
        to: likeNode.id,
        fromProperty: 'mid',
        toProperty: 'mid',
      },
      {
        id: generateId(),
        from: showNode.id,
        to: likeNode.id,
        fromProperty: 'uid',
        toProperty: 'uid',
      },
    ];

    // 创建工作流
    const workflow = new WorkflowGraphAst();
    workflow.name = 'kindergarten-closure-event';
    workflow.nodes = [searchNode, showNode, commentNode, repostNode, likeNode];
    workflow.edges = edges;
    workflow.viewport = { x: 0, y: 0, zoom: 1 };

    return workflow;
  }

  /**
   * 获取模板描述
   */
  getTemplateDescription(templateName: string): string {
    switch (templateName) {
      case 'kindergarten-closure-event':
        return '幼儿园关停事件舆情数据采集工作流，包含：关键词搜索 → 博文详情 → 评论（含子评论）+ 转发 + 点赞';
      default:
        return '未知模板';
    }
  }
}
