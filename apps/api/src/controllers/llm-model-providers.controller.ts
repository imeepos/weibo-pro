import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { root } from '@sker/core';
import { LlmModelProviderService } from '../services/llm-model-provider.service';
import { LlmModelProvider } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller('api/llm-model-providers')
export class LlmModelProvidersController implements sdk.LlmModelProvidersController {
  private service: LlmModelProviderService;

  constructor() {
    this.service = root.get(LlmModelProviderService);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get('by-model/:modelId')
  async findByModel(@Param('modelId') modelId: string) {
    return this.service.findByModel(modelId);
  }

  @Get('by-provider/:providerId')
  async findByProvider(@Param('providerId') providerId: string) {
    return this.service.findByProvider(providerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: { modelId: string; providerId: string; modelName: string }): Promise<LlmModelProvider> {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<LlmModelProvider>): Promise<LlmModelProvider> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
