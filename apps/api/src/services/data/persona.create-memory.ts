import {
  useEntityManager,
  MemoryEntity,
  MemoryRelationEntity,
  MemoryClosureEntity,
} from '@sker/entities';
import type {
  MemoryNode,
  CreateMemoryRequest,
} from '@sker/sdk';

/**
 * 创建记忆并建立关系、闭包
 */
export async function createPersonaMemory(
  personaId: string,
  request: Omit<CreateMemoryRequest, 'personaId'>,
): Promise<MemoryNode> {
  const { name, content, type, relatedMemoryIds = [] } = request;

  return useEntityManager(async (manager) => {
    // 创建记忆
    const memory = manager.create(MemoryEntity, {
      persona_id: personaId,
      name,
      content,
      type,
    });
    await manager.save(memory);

    // 创建关系
    for (const relatedId of relatedMemoryIds) {
      const relation = manager.create(MemoryRelationEntity, {
        source_id: relatedId,
        target_id: memory.id,
        relation_type: 'related',
      });
      await manager.save(relation);

      // 更新闭包表
      await updateClosure(manager, relatedId, memory.id);
    }

    // 自引用闭包
    const selfClosure = manager.create(MemoryClosureEntity, {
      ancestor_id: memory.id,
      descendant_id: memory.id,
      path: [memory.id],
      depth: 0,
    });
    await manager.save(selfClosure);

    return {
      id: memory.id,
      name: memory.name,
      description: memory.description,
      content: memory.content,
      type: memory.type,
      createdAt: memory.created_at.toISOString(),
    };
  });
}

/**
 * 更新闭包表：为源节点的所有祖先创建到新节点的闭包
 */
async function updateClosure(manager: any, sourceId: string, targetId: string): Promise<void> {
  // 获取源节点的所有祖先
  const ancestorClosures = await manager.find(MemoryClosureEntity, {
    where: { descendant_id: sourceId },
  });

  // 为每个祖先创建到新节点的闭包
  for (const ac of ancestorClosures) {
    const newClosure = manager.create(MemoryClosureEntity, {
      ancestor_id: ac.ancestor_id,
      descendant_id: targetId,
      path: [...ac.path, targetId],
      depth: ac.depth + 1,
    });
    await manager.save(newClosure);
  }
}
