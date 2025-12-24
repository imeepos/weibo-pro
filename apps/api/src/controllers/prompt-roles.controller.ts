import { Controller, Get, Post, Put, Delete, Body, Param } from '@sker/core';
import { root } from '@sker/core';
import { PromptRoleService } from '../services/prompt-role.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.PromptRolesController)
export class PromptRolesController implements sdk.PromptRolesController {
  private service = root.get(PromptRoleService);

  findAll() {
    return this.service.findAll();
  }

  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  addSkill(@Param('id') roleId: string, @Body() dto: any) {
    return this.service.addSkill(roleId, dto);
  }

  removeSkill(@Param('id') roleId: string, @Param('skillId') skillId: string) {
    return this.service.removeSkill(roleId, skillId);
  }

  getSkills(@Param('id') roleId: string) {
    return this.service.getSkills(roleId);
  }
}
