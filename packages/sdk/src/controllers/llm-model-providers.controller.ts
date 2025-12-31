import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@sker/core';
import type { LlmModelProvider } from '@sker/entities';

export interface LlmModelProviderWithRelations extends Omit<LlmModelProvider, 'model' | 'provider'> {
  model?: { id: string; name: string };
  provider?: { id: string; name: string; score: number };
  tierLevel: number;
  supportsThinking: boolean;
  enabled: boolean;
}

@Controller('llm-model-providers')
export class LlmModelProvidersController {

  @Get('/list')
  findAll(): Promise<LlmModelProviderWithRelations[]> {
    throw new Error('method findAll not implements');
  }

  @Get('by-model')
  findByModel(@Query('modelId') modelId: string): Promise<LlmModelProviderWithRelations[]> {
    throw new Error('method findByModel not implements');
  }

  @Get('by-provider')
  findByProvider(@Query('providerId') providerId: string): Promise<LlmModelProviderWithRelations[]> {
    throw new Error('method findByProvider not implements');
  }

  @Get('get')
  findOne(@Query('id') id: string): Promise<LlmModelProviderWithRelations | null> {
    throw new Error('method findOne not implements');
  }

  @Post('create')
  create(@Body() dto: { modelId: string; providerId: string; modelName: string; tierLevel?: number; supportsThinking?: boolean }): Promise<LlmModelProvider> {
    throw new Error('method create not implements');
  }

  @Post('update')
  update(@Body('id') id: string, @Body() dto: Partial<{ modelId: string; providerId: string; modelName: string; tierLevel: number; supportsThinking: boolean }>): Promise<LlmModelProvider> {
    throw new Error('method update not implements');
  }

  @Post('remove')
  remove(@Body('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }

  @Put(':id/enable')
  enable(@Param('id') id: string): Promise<void> {
    throw new Error('method enable not implements');
  }

  @Put(':id/disable')
  disable(@Param('id') id: string): Promise<void> {
    throw new Error('method disable not implements');
  }
}
