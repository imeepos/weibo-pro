import { WorkflowEntity, WorkflowStatus } from '@sker/entities';
import { logger } from '@sker/core';
import { randomUUID } from 'crypto';
import { WorkflowGraphAst } from '@sker/workflow';
import * as sdk from '@sker/sdk';
import type { EntityManager } from 'typeorm';

/**
 * 保存工作流：通过 name (code) 查找或创建，自动清理孤立引用（已删除节点的 ID）。
 */
export async function saveWorkflowEntity(
  manager: EntityManager,
  params: WorkflowGraphAst,
): Promise<WorkflowEntity> {
  const repository = manager.getRepository(WorkflowEntity);

  // 收集所有节点 ID（包括嵌套分组内的节点）
  const collectNodeIds = (nodes: any[]): Set<string> => {
    const ids = new Set<string>();
    for (const node of nodes) {
      ids.add(node.id);
      if (node.nodes?.length) {
        for (const id of collectNodeIds(node.nodes)) {
          ids.add(id);
        }
      }
    }
    return ids;
  };

  const nodeIds = collectNodeIds(params.nodes || []);

  // 清理孤立引用
  const cleanedEntryNodeIds = (params.entryNodeIds || []).filter(id => nodeIds.has(id));
  const cleanedEndNodeIds = (params.endNodeIds || []).filter(id => nodeIds.has(id));

  // 查找现有工作流（通过 code）
  let workflow = await repository.findOne({
    where: { code: params.name },
  });

  if (workflow) {
    workflow.name = params.name || workflow.name;
    workflow.code = params.name || workflow.code;
    workflow.collapsed = !!params.collapsed;
    workflow.nodes = params.nodes || [];
    workflow.edges = params.edges || [];
    workflow.entryNodeIds = cleanedEntryNodeIds;
    workflow.endNodeIds = cleanedEndNodeIds;
    workflow.position = params.position;
    workflow.width = params.width;
    workflow.viewport = params.viewport;
    workflow.tags = params.tags || [];
    workflow.description = params.description;
    workflow.color = params.color;
  } else {
    const workflowId = params.id || params.name || randomUUID();
    const workflowName = params.name || 'Untitled';

    workflow = repository.create({
      id: workflowId,
      code: workflowName,
      name: workflowName,
      description: params.description,
      color: params.color,
      type: params.type || 'WorkflowGraphAst',
      nodes: params.nodes || [],
      edges: params.edges || [],
      entryNodeIds: cleanedEntryNodeIds,
      endNodeIds: cleanedEndNodeIds,
      position: params.position,
      width: params.width,
      viewport: params.viewport,
      collapsed: !!params.collapsed,
      tags: params.tags || [],
      defaultInputs: {},
      status: WorkflowStatus.ACTIVE,
    });
  }

  await repository.save(workflow);

  return workflow;
}

/**
 * 根据 name 获取工作流（实体转 WorkflowGraphAst）。
 */
export async function getWorkflowByNameEntity(
  manager: EntityManager,
  name: string,
): Promise<WorkflowGraphAst | null> {
  const repository = manager.getRepository(WorkflowEntity);

  const workflow = await repository.findOne({
    where: { code: name },
  });

  if (!workflow) {
    return null;
  }

  return {
    id: workflow.id,
    type: workflow.type,
    name: workflow.name,
    description: workflow.description,
    color: workflow.color,
    nodes: workflow.nodes,
    edges: workflow.edges,
    entryNodeIds: workflow.entryNodeIds,
    endNodeIds: workflow.endNodeIds,
    position: workflow.position,
    width: workflow.width,
    viewport: workflow.viewport,
    collapsed: workflow.collapsed,
    tags: workflow.tags,
  } as WorkflowGraphAst;
}

/**
 * 列出所有激活状态的工作流摘要。
 */
export async function listWorkflowSummaries(
  manager: EntityManager,
): Promise<sdk.WorkflowSummary[]> {
  const repository = manager.getRepository(WorkflowEntity);

  const workflows = await repository.find({
    where: { status: WorkflowStatus.ACTIVE },
    order: { updatedAt: 'DESC' },
  });

  return workflows.map(w => ({
    id: String(w.id),
    name: w.name,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    tags: w.tags,
    description: w.description,
  }));
}

/**
 * 软删除工作流，返回是否删除成功。
 */
export async function deleteWorkflowEntity(
  manager: EntityManager,
  id: string,
): Promise<boolean> {
  const repository = manager.getRepository(WorkflowEntity);

  const result = await repository.softDelete(id);

  const deleted = (result.affected ?? 0) > 0;

  if (deleted) {
    logger.info('Workflow deleted', { id });
  }

  return deleted;
}
