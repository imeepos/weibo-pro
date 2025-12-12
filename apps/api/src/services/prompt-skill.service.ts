import { Injectable } from '@sker/core';
import { PromptSkillEntity, PromptRoleSkillRefEntity, useEntityManager, type PromptSkillType } from '@sker/entities';

@Injectable({ providedIn: 'root' })
export class PromptSkillService {

  async findAll(type?: PromptSkillType) {
    return useEntityManager(async m => {
      return m.find(PromptSkillEntity, {
        where: type ? { type } : undefined,
        order: { type: 'ASC', created_at: 'DESC' }
      });
    });
  }

  async findOne(id: string) {
    return useEntityManager(async m => {
      return m.findOne(PromptSkillEntity, { where: { id } });
    });
  }

  async create(dto: Partial<PromptSkillEntity>) {
    return useEntityManager(async m => {
      const entity = m.create(PromptSkillEntity, dto);
      return m.save(PromptSkillEntity, entity);
    });
  }

  async update(id: string, dto: Partial<PromptSkillEntity>) {
    return useEntityManager(async m => {
      await m.update(PromptSkillEntity, id, dto);
      return m.findOneOrFail(PromptSkillEntity, { where: { id } });
    });
  }

  async remove(id: string) {
    await useEntityManager(async m => {
      await m.delete(PromptRoleSkillRefEntity, { skill_id: id });
      await m.delete(PromptSkillEntity, id);
    });
  }
}
