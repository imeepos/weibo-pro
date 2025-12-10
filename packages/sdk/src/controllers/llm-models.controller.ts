import { Controller, Get, Post, Put, Delete, Body, Param } from '@sker/core';
import type { LlmModel } from '@sker/entities';

@Controller('api/llm-models')
export class LlmModelsController {

  @Get()
  findAll(): Promise<LlmModel[]> {
    throw new Error('method findAll not implements');
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<LlmModel | null> {
    throw new Error('method findOne not implements');
  }

  @Post()
  create(@Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    throw new Error('method create not implements');
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    throw new Error('method update not implements');
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }
}
