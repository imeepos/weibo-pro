import { Controller, Body, Param, } from '@sker/core';
import { root } from '@sker/core';
import { LlmProviderService } from '../services/llm-provider.service';
import { LlmProvider } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller(sdk.LlmProvidersController)
export class LlmProvidersController implements sdk.LlmProvidersController {
  private llmProviderService: LlmProviderService;

  constructor() {
    this.llmProviderService = root.get(LlmProviderService);
  }

  async findAll(): Promise<LlmProvider[]> {
    return this.llmProviderService.findAll();
  }

  async findOne(@Param('id') id: string): Promise<LlmProvider | null> {
    return this.llmProviderService.findOne(id);
  }

  async create(@Body() createLlmProviderDto: Partial<LlmProvider>): Promise<LlmProvider> {
    return this.llmProviderService.create(createLlmProviderDto);
  }

  async update(
    @Param('id') id: string,
    @Body() updateLlmProviderDto: Partial<LlmProvider>
  ): Promise<LlmProvider> {
    return this.llmProviderService.update(id, updateLlmProviderDto);
  }

  async remove(@Param('id') id: string): Promise<void> {
    return this.llmProviderService.remove(id);
  }

  async getBestProvider(): Promise<LlmProvider | null> {
    return this.llmProviderService.getBestProvider();
  }

  async updateScore(
    @Param('id') id: string,
    @Body('score') score: number
  ): Promise<void> {
    return this.llmProviderService.updateScore(id, score);
  }
}