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

  async create(dto: { modelId: string; providerId: string; modelName: string; tierLevel?: number; supportsThinking?: boolean }): Promise<LlmModelProvider> {
    return useEntityManager(async m => {
      const existing = await m.findOne(LlmModelProvider, {
        where: {
          modelName: dto.modelName,
          providerId: dto.providerId,
          modelId: dto.modelId
        }
      });

      if (existing) {
        return m.findOne(LlmModelProvider, { where: { id: existing.id } }) as Promise<LlmModelProvider>;
      }

      const entity = m.create(LlmModelProvider, dto);
      return m.save(LlmModelProvider, entity);
    });
  }

  async update(id: string, dto: Partial<LlmModelProvider>): Promise<LlmModelProvider> {
    return useEntityManager(async m => {
      const current = await m.findOne(LlmModelProvider, { where: { id } });
      if (!current) throw new Error(`模型提供商配置 ${id} 不存在`);

      // 检查是否会违反唯一约束
      if (dto.modelName !== undefined || dto.providerId !== undefined || dto.modelId !== undefined) {
        const conflict = await m.findOne(LlmModelProvider, {
          where: {
            modelName: dto.modelName ?? current.modelName,
            providerId: dto.providerId ?? current.providerId,
            modelId: dto.modelId ?? current.modelId
          }
        });

        if (conflict && conflict.id !== id) {
          throw new Error(
            `配置冲突：模型 "${dto.modelName ?? current.modelName}" ` +
            `在提供商 "${dto.providerId ?? current.providerId}" 下已存在`
          );
        }
      }

      await m.update(LlmModelProvider, id, dto);
      return m.findOne(LlmModelProvider, { where: { id } }) as Promise<LlmModelProvider>;
    });
  }

  async remove(id: string): Promise<void> {
    await useEntityManager(m => m.delete(LlmModelProvider, id));
  }

  async enable(id: string): Promise<void> {
    await LlmModelProvider.enable(id);
  }

  async disable(id: string): Promise<void> {
    await LlmModelProvider.disable(id);
  }
}
