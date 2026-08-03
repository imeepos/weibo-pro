import { Injectable } from '@sker/core';
import { WorkflowEntity, WorkflowShareEntity, useEntityManager } from '@sker/entities';
import { logger } from '@sker/core';
import { randomBytes } from 'crypto';
import { WorkflowGraphAst } from '@sker/workflow';
import * as sdk from '@sker/sdk';
import {
  saveWorkflowEntity,
  getWorkflowByNameEntity,
  listWorkflowSummaries,
  deleteWorkflowEntity,
} from './workflow.graph';

/**
 * 工作流服务
 *
 * 存在即合理：
 * - 管理工作流的持久化
 * - 处理序列化/反序列化
 * - 生成分享令牌
 *
 * 优雅设计：
 * - 使用 TypeORM 数据库持久化
 * - 事务保证数据一致性
 */
@Injectable({ providedIn: 'root' })
export class WorkflowService {

  /**
   * 保存工作流
   *
   * 优雅设计：
   * - 通过 name (code) 查找或创建
   * - 使用数据库事务保证一致性
   * - 自动清理孤立引用（已删除节点的 ID）
   */
  async saveWorkflow(params: WorkflowGraphAst): Promise<WorkflowEntity> {
    return useEntityManager(async (manager) => {
      return saveWorkflowEntity(manager, params);
    });
  }

  /**
   * 根据 name 获取工作流
   */
  async getWorkflowByName(name: string): Promise<WorkflowGraphAst | null> {
    return useEntityManager(async (manager) => {
      return getWorkflowByNameEntity(manager, name);
    });
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<sdk.WorkflowSummary[]> {
    return useEntityManager(async (manager) => {
      return listWorkflowSummaries(manager);
    });
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    return useEntityManager(async (manager) => {
      return deleteWorkflowEntity(manager, id);
    });
  }

  /**
   * 创建分享链接
   *
   * 优雅设计：
   * - 生成安全的随机 token
   * - 支持可选的过期时间
   * - 使用独立的分享表
   * - 支持通过 ID 或 code 查找工作流
   */
  async createShare(params: {
    workflowId: string;
    expiresAt?: string;
  }): Promise<{ shareToken: string; shareUrl: string }> {
    return useEntityManager(async (manager) => {
      const workflowRepository = manager.getRepository(WorkflowEntity);
      const shareRepository = manager.getRepository(WorkflowShareEntity);

      // 尝试通过 ID 或 code 查找工作流
      let workflow: WorkflowEntity | null = null;

      logger.debug('Searching workflow by ID', { id: params.workflowId });
      workflow = await workflowRepository.findOne({
        where: { id: params.workflowId },
      });

      if (!workflow) {
        logger.debug('Searching workflow by code', { code: params.workflowId });
        workflow = await workflowRepository.findOne({
          where: { code: params.workflowId },
        });
      }

      if (!workflow) {
        logger.error('Workflow not found', { workflowId: params.workflowId });
        throw new Error(`工作流不存在: ${params.workflowId}`);
      }

      // 创建分享记录
      const shareToken = this.generateShareToken();
      const share = shareRepository.create({
        token: shareToken,
        workflowId: workflow.id,
        expiresAt: params.expiresAt ? new Date(params.expiresAt) : undefined,
      });

      await shareRepository.save(share);

      logger.info('Share created', { workflowId: params.workflowId, shareToken });

      return {
        shareToken,
        shareUrl: `/workflow/shared/${shareToken}`,
      };
    });
  }

  /**
   * 获取分享的工作流
   */
  async getSharedWorkflow(token: string): Promise<WorkflowData | null> {
    return useEntityManager(async (manager) => {
      const shareRepository = manager.getRepository(WorkflowShareEntity);
      const workflowRepository = manager.getRepository(WorkflowEntity);

      // 查找分享记录
      const share = await shareRepository.findOne({
        where: { token },
      });

      if (!share) {
        return null;
      }

      // 检查是否过期
      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        await shareRepository.delete(share.id);
        return null;
      }

      // 获取工作流
      const workflow = await workflowRepository.findOne({
        where: { id: share.workflowId },
      });

      if (!workflow) {
        return null;
      }

      logger.info('Shared workflow accessed', { token, workflowId: share.workflowId });

      return {
        id: String(workflow.id),
        name: workflow.name,
        data: {
          nodes: workflow.nodes,
          edges: workflow.edges,
        },
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      };
    });
  }

  /**
   * 生成分享 token
   */
  private generateShareToken(): string {
    return randomBytes(16).toString('hex');
  }
}

interface WorkflowData {
  id: string;
  name: string;
  data: {
    nodes: any[];
    edges: any[];
  };
  createdAt: string;
  updatedAt: string;
}
