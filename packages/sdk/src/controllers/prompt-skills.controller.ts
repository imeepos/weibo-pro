import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@sker/core';
import type { PromptSkillEntity, PromptSkillType } from '@sker/entities';

@Controller('api/prompt-skills')
export class PromptSkillsController {

  @Get()
  findAll(@Query('type') type?: PromptSkillType): Promise<PromptSkillEntity[]> {
    throw new Error('method findAll not implements');
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PromptSkillEntity | null> {
    throw new Error('method findOne not implements');
  }

  @Post()
  create(@Body() dto: Partial<PromptSkillEntity>): Promise<PromptSkillEntity> {
    throw new Error('method create not implements');
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<PromptSkillEntity>): Promise<PromptSkillEntity> {
    throw new Error('method update not implements');
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }
}
