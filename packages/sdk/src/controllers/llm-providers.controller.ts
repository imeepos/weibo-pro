import { Controller, Get, Post, Put, Delete, Body, Param } from '@sker/core';
import type { LlmProvider } from '@sker/entities';

@Controller('llm-providers')
export class LlmProvidersController {

  @Get('/list')
  findAll(): Promise<LlmProvider[]> {
    throw new Error('method findAll not implements');
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<LlmProvider | null> {
    throw new Error('method findOne not implements');
  }

  @Post()
  create(@Body() createLlmProviderDto: Partial<LlmProvider>): Promise<LlmProvider> {
    throw new Error('method create not implements');
  }

  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() updateLlmProviderDto: Partial<LlmProvider>
  ): Promise<LlmProvider> {
    throw new Error('method update not implements');
  }

  @Post(':id')
  remove(@Param('id') id: string): Promise<void> {
    throw new Error('method remove not implements');
  }

  @Get('available/best')
  getBestProvider(): Promise<LlmProvider | null> {
    throw new Error('method getBestProvider not implements');
  }

  @Post(':id/score')
  updateScore(
    @Param('id') id: string,
    @Body('score') score: number
  ): Promise<void> {
    throw new Error('method updateScore not implements');
  }
}