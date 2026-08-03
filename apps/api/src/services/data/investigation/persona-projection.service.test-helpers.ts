import { vi } from 'vitest';
import { useEntityManager } from '@sker/entities';

export interface PersonaProjectionPublishMocks {
  savedEntities: Record<string, any[]>;
}

/**
 * 注册 publishProfile 所需的内存仓储 mock。
 *
 * 返回 savedEntities，用于断言实际写入各实体的数据。
 * 每次调用都会创建独立的 savedEntities 与自增 id 序列。
 */
export function setupPersonaProjectionPublishMocks(): PersonaProjectionPublishMocks {
  const savedEntities: Record<string, any[]> = {};
  let sequence = 0;

  vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
    const createRepo = (entityName: string) => ({
      async findOne() {
        return null;
      },
      async find(options?: any) {
        if (entityName === 'MemoryEntity') {
          return [];
        }
        if (entityName === 'MemoryClosureEntity' && options?.where?.descendant_id) {
          return [{
            ancestor_id: options.where.descendant_id,
            descendant_id: options.where.descendant_id,
            path: [options.where.descendant_id],
            depth: 0,
          }];
        }
        return [];
      },
      create(input: any) {
        return { ...input };
      },
      async save(input: any) {
        const entity = {
          id: input.id ?? `${entityName}-${++sequence}`,
          ...input,
          created_at: input.created_at ?? new Date('2026-04-23T00:00:00.000Z'),
          updated_at: input.updated_at ?? new Date('2026-04-23T00:00:00.000Z'),
        };
        savedEntities[entityName] ??= [];
        savedEntities[entityName].push(entity);
        return entity;
      },
      async delete() {
        return;
      },
    });

    return handler({
      getRepository(entity: any) {
        return createRepo(entity.name);
      },
    });
  });

  return { savedEntities };
}
