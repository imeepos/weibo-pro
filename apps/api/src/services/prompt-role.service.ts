import { Injectable } from '@sker/core';
import { PromptRoleEntity, PromptRoleSkillRefEntity, PromptSkillEntity, useEntityManager } from '@sker/entities';

@Injectable({ providedIn: 'root' })
export class PromptRoleService {

  async findAll() {
    return useEntityManager(async m => {
      return m.find(PromptRoleEntity, {
        relations: ['skill_refs', 'skill_refs.skill'],
        order: { created_at: 'DESC' }
      });
    });
  }

  async findOne(id: string) {
    return useEntityManager(async m => {
      return m.findOne(PromptRoleEntity, {
        where: { id },
        relations: ['skill_refs', 'skill_refs.skill']
      });
    });
  }

  async create(dto: Partial<PromptRoleEntity>) {
    return useEntityManager(async m => {
      const entity = m.create(PromptRoleEntity, dto);
      return m.save(PromptRoleEntity, entity);
    });
  }

  async update(id: string, dto: Partial<PromptRoleEntity>) {
    return useEntityManager(async m => {
      await m.update(PromptRoleEntity, id, dto);
      return m.findOneOrFail(PromptRoleEntity, { where: { id } });
    });
  }

  async remove(id: string) {
    await useEntityManager(async m => {
      await m.delete(PromptRoleSkillRefEntity, { role_id: id });
      await m.delete(PromptRoleEntity, id);
    });
  }

  async addSkill(roleId: string, dto: { skill_id: string; ref_type?: string; sort_order?: number }) {
    return useEntityManager(async m => {
      const skill = await m.findOneOrFail(PromptSkillEntity, { where: { id: dto.skill_id } });
      const ref = m.create(PromptRoleSkillRefEntity, {
        role_id: roleId,
        skill_id: dto.skill_id,
        skill_type: skill.type,
        ref_type: (dto.ref_type || 'required') as any,
        sort_order: dto.sort_order || 0
      });
      return m.save(PromptRoleSkillRefEntity, ref);
    });
  }

  async removeSkill(roleId: string, skillId: string) {
    await useEntityManager(async m => {
      await m.delete(PromptRoleSkillRefEntity, { role_id: roleId, skill_id: skillId });
    });
  }
}
