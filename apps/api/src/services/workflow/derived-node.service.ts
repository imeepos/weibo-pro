import { Injectable } from '@sker/core';
import { DerivedNodeEntity, DerivedNodeStatus, useEntityManager } from '@sker/entities';
import { DynamicNodeRegistry } from '@sker/workflow';
import { logger } from '@sker/core';

/**
 * 派生节点服务
 *
 * 存在即合理：
 * - 保存用户创建的派生节点
 * - 发布节点到运行时注册表
 * - 启动时加载已发布节点
 */
@Injectable({ providedIn: 'root' })
export class DerivedNodeService {
  /**
   * 保存为节点
   */
  async saveAsNode(params: {
    name: string;
    baseType: string;
    frozenInputs: Record<string, unknown>;
    nodeMetadata: {
      class: { title: string; type: string; description?: string };
      inputs: Array<{ property: string; title: string; type?: string; defaultValue?: unknown }>;
      outputs: Array<{ property: string; title: string; defaultValue?: unknown }>;
      states?: Array<{ property: string; title: string }>;
    };
    createdBy?: string;
  }): Promise<DerivedNodeEntity> {
    return useEntityManager(async (manager) => {
      const repository = manager.getRepository(DerivedNodeEntity);

      const existing = await repository.findOne({ where: { name: params.name } });
      if (existing) {
        throw new Error(`节点名称已存在: ${params.name}`);
      }

      const node = repository.create({
        name: params.name,
        baseType: params.baseType,
        frozenInputs: params.frozenInputs,
        nodeMetadata: params.nodeMetadata,
        status: DerivedNodeStatus.DRAFT,
        version: 1,
        createdBy: params.createdBy,
      });

      await repository.save(node);
      logger.info('派生节点已保存', { name: params.name, baseType: params.baseType });

      return node;
    });
  }

  /**
   * 发布节点
   */
  async publish(id: string): Promise<void> {
    return useEntityManager(async (manager) => {
      const repository = manager.getRepository(DerivedNodeEntity);

      const node = await repository.findOne({ where: { id } });
      if (!node) {
        throw new Error(`节点不存在: ${id}`);
      }

      node.status = DerivedNodeStatus.PUBLISHED;
      await repository.save(node);

      DynamicNodeRegistry.register({
        name: node.name,
        baseType: node.baseType,
        frozenInputs: node.frozenInputs,
        nodeMetadata: node.nodeMetadata,
      });

      logger.info('派生节点已发布', { id, name: node.name });
    });
  }

  /**
   * 加载所有已发布节点
   */
  async loadAll(): Promise<void> {
    return useEntityManager(async (manager) => {
      const repository = manager.getRepository(DerivedNodeEntity);

      const nodes = await repository.find({
        where: { status: DerivedNodeStatus.PUBLISHED },
      });

      for (const node of nodes) {
        try {
          DynamicNodeRegistry.register({
            name: node.name,
            baseType: node.baseType,
            frozenInputs: node.frozenInputs,
            nodeMetadata: node.nodeMetadata,
          });
          logger.info('派生节点已加载', { name: node.name });
        } catch (error) {
          logger.error('派生节点加载失败', { name: node.name, error });
        }
      }

      logger.info('派生节点加载完成', { count: nodes.length });
    });
  }

  /**
   * 列出所有节点
   */
  async list(): Promise<DerivedNodeEntity[]> {
    return useEntityManager(async (manager) => {
      const repository = manager.getRepository(DerivedNodeEntity);
      return repository.find({ order: { createdAt: 'DESC' } });
    });
  }
}
