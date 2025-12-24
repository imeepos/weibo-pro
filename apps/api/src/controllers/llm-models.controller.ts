import { Controller, Get, Post, Put, Delete, Body, Param } from '@sker/core';
import { root } from '@sker/core';
import { LlmModelService } from '../services/llm-model.service';
import { LlmModel } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller(sdk.LlmModelsController)
export class LlmModelsController implements sdk.LlmModelsController {
  private service: LlmModelService;

  constructor() {
    this.service = root.get(LlmModelService);
  }

  async findAll(): Promise<LlmModel[]> {
    return this.service.findAll();
  }

  async findOne(@Param('id') id: string): Promise<LlmModel | null> {
    return this.service.findOne(id);
  }

  async create(@Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    return this.service.create(dto);
  }

  async update(@Param('id') id: string, @Body() dto: Partial<LlmModel>): Promise<LlmModel> {
    return this.service.update(id, dto);
  }

  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
