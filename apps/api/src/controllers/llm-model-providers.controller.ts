import { Controller, Get, Post, Put, Delete, Body, Param } from '@sker/core';
import { root } from '@sker/core';
import { LlmModelProviderService } from '../services/llm-model-provider.service';
import { LlmModelProvider } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller(sdk.LlmModelProvidersController)
export class LlmModelProvidersController implements sdk.LlmModelProvidersController {
  private service: LlmModelProviderService;

  constructor() {
    this.service = root.get(LlmModelProviderService);
  }

  async findAll() {
    return this.service.findAll();
  }

  async findByModel(@Param('modelId') modelId: string) {
    return this.service.findByModel(modelId);
  }

  async findByProvider(@Param('providerId') providerId: string) {
    return this.service.findByProvider(providerId);
  }

  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  async create(@Body() dto: { modelId: string; providerId: string; modelName: string; tierLevel?: number; supportsThinking?: boolean }): Promise<LlmModelProvider> {
    return this.service.create(dto);
  }

  async update(@Param('id') id: string, @Body() dto: Partial<LlmModelProvider>): Promise<LlmModelProvider> {
    return this.service.update(id, dto);
  }

  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }

  async enable(@Param('id') id: string): Promise<void> {
    return this.service.enable(id);
  }

  async disable(@Param('id') id: string): Promise<void> {
    return this.service.disable(id);
  }
}
