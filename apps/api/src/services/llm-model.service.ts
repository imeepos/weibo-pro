import { Injectable } from '@sker/core';
import { LlmModel, useEntityManager } from '@sker/entities';

@Injectable({ providedIn: 'root' })
export class LlmModelService {

  async findAll(): Promise<LlmModel[]> {
    return useEntityManager(m => m.find(LlmModel, { order: { name: 'ASC' } }));
  }

  async findOne(id: string): Promise<LlmModel | null> {
    return useEntityManager(m => m.findOne(LlmModel, { where: { id } }));
  }

  async create(dto: Partial<LlmModel>): Promise<LlmModel> {
    return useEntityManager(async m => {
      const model = m.create(LlmModel, dto);
      return m.save(LlmModel, model);
    });
  }

  async update(id: string, dto: Partial<LlmModel>): Promise<LlmModel> {
    return useEntityManager(async m => {
      await m.update(LlmModel, id, dto);
      const model = await m.findOne(LlmModel, { where: { id } });
      if (!model) throw new Error(`LlmModel ${id} not found`);
      return model;
    });
  }

  async remove(id: string): Promise<void> {
    await useEntityManager(m => m.delete(LlmModel, id));
  }
}
