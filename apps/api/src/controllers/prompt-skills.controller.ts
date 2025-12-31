import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@sker/core';
import { root } from '@sker/core';
import { PromptSkillService } from '../services/prompt-skill.service';
import * as sdk from '@sker/sdk';
import type { PromptSkillType } from '@sker/entities';

@Controller(sdk.PromptSkillsController)
export class PromptSkillsController implements sdk.PromptSkillsController {
  private service = root.get(PromptSkillService);

  findAll(type?: PromptSkillType) {
    return this.service.findAll(type);
  }

  findOne(id: string) {
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
}
