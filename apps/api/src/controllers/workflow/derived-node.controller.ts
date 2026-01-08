import { Controller, Post, Body, Get, Put, Param } from '@sker/core';
import { root } from '@sker/core';
import { DerivedNodeService } from '../../services/workflow/derived-node.service';
import type { DerivedNodeEntity } from '@sker/entities';
import * as sdk from '@sker/sdk';
import type { CreateDerivedNodePayload } from '@sker/sdk';

/**
 * 派生节点控制器
 *
 * 存在即合理：
 * - 提供派生节点的 REST API
 * - 支持保存、发布、列表操作
 */
@Controller(sdk.DerivedNodeController)
export class DerivedNodeController implements sdk.DerivedNodeController {
  private readonly service: DerivedNodeService;

  constructor() {
    this.service = root.get(DerivedNodeService);
  }

  @Post('/')
  async create(@Body() body: CreateDerivedNodePayload): Promise<DerivedNodeEntity> {
    return this.service.saveAsNode(body);
  }

  @Put('/:id/publish')
  async publish(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.service.publish(id);
    return { success: true };
  }

  @Get('/')
  async list(): Promise<DerivedNodeEntity[]> {
    return this.service.list();
  }
}
