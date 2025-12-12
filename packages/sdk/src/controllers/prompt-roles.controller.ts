import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@sker/core';
import type { PromptRoleEntity, PromptRoleSkillRefEntity } from '@sker/entities';

export interface PromptRoleWithSkills extends Omit<PromptRoleEntity, 'skill_refs'> {
  skill_refs?: PromptRoleSkillRefEntity[];
}

@Controller('api/prompt-roles')
export class PromptRolesController {

  @Get()
  findAll(): Promise<PromptRoleWithSkills[]> {
    throw new Error('method findAll not implements');
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PromptRoleWithSkills | null> {
    throw new Error('method findOne not implements');
  }

  @Post()
  create(@Body() dto: Partial<PromptRoleEntity>): Promise<PromptRoleEntity> {
    throw new Error('method create not implements');
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<PromptRoleEntity>): Promise<PromptRoleEntity> {
    throw new Error('method update not implements');
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }

  @Post(':id/skills')
  addSkill(@Param('id') roleId: string, @Body() dto: { skill_id: string; ref_type?: string; sort_order?: number }): Promise<PromptRoleSkillRefEntity> {
    throw new Error('method addSkill not implements');
  }

  @Delete(':id/skills/:skillId')
  removeSkill(@Param('id') roleId: string, @Param('skillId') skillId: string): Promise<void> {
    throw new Error('method removeSkill not implements');
  }
}
