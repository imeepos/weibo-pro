import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@sker/core';
import type { LlmModelProvider } from '@sker/entities';

export interface LlmModelProviderWithRelations extends Omit<LlmModelProvider, 'model' | 'provider'> {
  model?: { id: string; name: string };
  provider?: { id: string; name: string };
}

@Controller('api/llm-model-providers')
export class LlmModelProvidersController {

  @Get()
  findAll(): Promise<LlmModelProviderWithRelations[]> {
    throw new Error('method findAll not implements');
  }

  @Get('by-model/:modelId')
  findByModel(@Param('modelId') modelId: string): Promise<LlmModelProviderWithRelations[]> {
    throw new Error('method findByModel not implements');
  }

  @Get('by-provider/:providerId')
  findByProvider(@Param('providerId') providerId: string): Promise<LlmModelProviderWithRelations[]> {
    throw new Error('method findByProvider not implements');
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<LlmModelProviderWithRelations | null> {
    throw new Error('method findOne not implements');
  }

  @Post()
  create(@Body() dto: { modelId: string; providerId: string; modelName: string }): Promise<LlmModelProvider> {
    throw new Error('method create not implements');
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<LlmModelProvider>): Promise<LlmModelProvider> {
    throw new Error('method update not implements');
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }
}
