import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { root } from '@sker/core';
import { LlmModelService } from '../services/llm-model.service';
import { LlmModel } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller('api/llm-models')
export class LlmModelsController implements sdk.LlmModelsController {
  private service: LlmModelService;

  constructor() {
    this.service = root.get(LlmModelService);
  }

  @Get()
  async findAll(): Promise<LlmModel[]> {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<LlmModel | null> {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
