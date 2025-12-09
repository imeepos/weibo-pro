import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { LlmProviderService } from '../services/llm-provider.service';
import { LlmProvider } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller('api/llm-providers')
export class LlmProvidersController implements sdk.LlmProvidersController {
  private llmProviderService: LlmProviderService;

  constructor() {
    this.llmProviderService = root.get(LlmProviderService);
  }

  @Get()
  async findAll(): Promise<LlmProvider[]> {
    return this.llmProviderService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<LlmProvider | null> {
    return this.llmProviderService.findOne(id);
  }

  @Post()
  async create(@Body() createLlmProviderDto: Partial<LlmProvider>): Promise<LlmProvider> {
    return this.llmProviderService.create(createLlmProviderDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLlmProviderDto: Partial<LlmProvider>
  ): Promise<LlmProvider> {
    return this.llmProviderService.update(id, updateLlmProviderDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.llmProviderService.remove(id);
  }

  @Get('available/best')
  async getBestProvider(): Promise<LlmProvider | null> {
    return this.llmProviderService.getBestProvider();
  }

  @Put(':id/score')
  async updateScore(
    @Param('id') id: string,
    @Body('score') score: number
  ): Promise<void> {
    return this.llmProviderService.updateScore(id, score);
  }
}