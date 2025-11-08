import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { root } from '@sker/core';
import { LayoutService, CreateLayoutPayload, UpdateLayoutPayload } from '../services/data/layout.service';

@Controller('api/layout')
export class LayoutController {
  private layoutService: LayoutService;

  constructor() {
    this.layoutService = root.get(LayoutService);
  }

  @Get()
  async getLayouts(@Query('type') type?: string) {
    const validType = this.validateType(type);
    return this.layoutService.getLayoutConfigurations(validType);
  }

  @Get('default')
  async getDefaultLayout(@Query('type') type?: string) {
    const validType = this.validateType(type);
    return this.layoutService.getDefaultLayout(validType);
  }

  @Get(':id')
  async getLayoutById(@Param('id') id: string) {
    return this.layoutService.getLayoutById(id);
  }

  @Post()
  async createLayout(@Body() payload: CreateLayoutPayload) {
    return this.layoutService.createLayout(payload);
  }

  @Put(':id')
  async updateLayout(@Param('id') id: string, @Body() payload: UpdateLayoutPayload) {
    return this.layoutService.updateLayout(id, payload);
  }

  @Delete(':id')
  async deleteLayout(@Param('id') id: string) {
    return this.layoutService.deleteLayout(id);
  }

  @Put(':id/set-default')
  async setDefaultLayout(@Param('id') id: string, @Body('type') type?: string) {
    const validType = this.validateType(type);
    return this.layoutService.setDefaultLayout(id, validType);
  }

  private validateType(type?: string): 'bigscreen' | 'frontend' | 'admin' {
    const validTypes: Array<'bigscreen' | 'frontend' | 'admin'> = ['bigscreen', 'frontend', 'admin'];

    if (type && validTypes.includes(type as any)) {
      return type as 'bigscreen' | 'frontend' | 'admin';
    }

    return 'bigscreen';
  }
}
