import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { PromptSkillService } from '../services/prompt-skill.service';
import * as sdk from '@sker/sdk';
import type { PromptSkillType } from '@sker/entities';

@Controller('api/prompt-skills')
export class PromptSkillsController implements sdk.PromptSkillsController {
  private service = root.get(PromptSkillService);

  @Get()
  findAll(@Query('type') type?: PromptSkillType) {
    return this.service.findAll(type);
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
}
