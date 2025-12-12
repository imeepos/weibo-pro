import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { root } from '@sker/core';
import { PromptRoleService } from '../services/prompt-role.service';
import * as sdk from '@sker/sdk';

@Controller('api/prompt-roles')
export class PromptRolesController implements sdk.PromptRolesController {
  private service = root.get(PromptRoleService);

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/skills')
  addSkill(@Param('id') roleId: string, @Body() dto: any) {
    return this.service.addSkill(roleId, dto);
  }

  @Delete(':id/skills/:skillId')
  removeSkill(@Param('id') roleId: string, @Param('skillId') skillId: string) {
    return this.service.removeSkill(roleId, skillId);
  }
}
