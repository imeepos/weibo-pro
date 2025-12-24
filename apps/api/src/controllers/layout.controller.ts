import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@sker/core';
import { root } from '@sker/core';
import { LayoutService, type CreateLayoutPayload, type UpdateLayoutPayload } from '../services/data/layout.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.LayoutController)
export class LayoutController implements sdk.LayoutController{
  private layoutService: LayoutService;

  constructor() {
    this.layoutService = root.get(LayoutService);
  }

  async getLayouts(@Query('type') type?: string) {
    const validType = this.validateType(type);
    return this.layoutService.getLayoutConfigurations(validType);
  }

  async getDefaultLayout(@Query('type') type?: string) {
    const validType = this.validateType(type);
    return this.layoutService.getDefaultLayout(validType);
  }

  async getLayoutById(@Param('id') id: string) {
    return this.layoutService.getLayoutById(id);
  }

  async createLayout(@Body() payload: CreateLayoutPayload) {
    return this.layoutService.createLayout(payload);
  }

  async updateLayout(@Param('id') id: string, @Body() payload: UpdateLayoutPayload) {
    return this.layoutService.updateLayout(id, payload);
  }

  async deleteLayout(@Param('id') id: string) {
    return this.layoutService.deleteLayout(id);
  }

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
