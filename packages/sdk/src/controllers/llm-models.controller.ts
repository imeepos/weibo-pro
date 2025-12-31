import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@sker/core';
import type { LlmModel } from '@sker/entities';

@Controller('llm-models')
export class LlmModelsController {

  @Get('/list')
  findAll(): Promise<LlmModel[]> {
    throw new Error('method findAll not implements');
  }

  @Get('get')
  findOne(@Query('id') id: string): Promise<LlmModel | null> {
    throw new Error('method findOne not implements');
  }

  @Post()
  create(@Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    throw new Error('method create not implements');
  }

  @Post('update')
  update(@Body('id') id: string, @Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    throw new Error('method update not implements');
  }

  @Post('remove')
  remove(@Body('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }
}
