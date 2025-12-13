import { Injectable } from '@sker/core';
import { LlmModelProvider, useEntityManager } from '@sker/entities';

@Injectable({ providedIn: 'root' })
export class LlmModelProviderService {

  async findAll() {
    return useEntityManager(m =>
      m.find(LlmModelProvider, {
        relations: ['model', 'provider'],
        order: { created_at: 'DESC' }
      })
    );
  }

  async findByModel(modelId: string) {
    return useEntityManager(m =>
      m.find(LlmModelProvider, {
        where: { modelId },
        relations: ['model', 'provider']
      })
    );
  }

  async findByProvider(providerId: string) {
    return useEntityManager(m =>
      m.find(LlmModelProvider, {
        where: { providerId },
        relations: ['model', 'provider']
      })
    );
  }

  async findOne(id: string) {
    return useEntityManager(m =>
      m.findOne(LlmModelProvider, {
        where: { id },
        relations: ['model', 'provider']
      })
    );
  }

  async create(dto: { modelId: string; providerId: string; modelName: string; tierLevel?: number }): Promise<LlmModelProvider> {
    return useEntityManager(async m => {
      const existing = await m.findOne(LlmModelProvider, {
        where: {
          modelName: dto.modelName,
          providerId: dto.providerId,
          modelId: dto.modelId
        }
      });

      if (existing) {
        await m.update(LlmModelProvider, existing.id, dto);
        return m.findOne(LlmModelProvider, { where: { id: existing.id } }) as Promise<LlmModelProvider>;
      }

      const entity = m.create(LlmModelProvider, dto);
      return m.save(LlmModelProvider, entity);
    });
  }

  async update(id: string, dto: Partial<LlmModelProvider>): Promise<LlmModelProvider> {
    return useEntityManager(async m => {
      await m.update(LlmModelProvider, id, dto);
      const entity = await m.findOne(LlmModelProvider, { where: { id } });
      if (!entity) throw new Error(`LlmModelProvider ${id} not found`);
      return entity;
    });
  }

  async remove(id: string): Promise<void> {
    await useEntityManager(m => m.delete(LlmModelProvider, id));
  }
}
