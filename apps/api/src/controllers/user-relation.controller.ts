import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { UserRelationService } from '../services/data/user-relation.service';
import type { TimeRange } from '@sker/entities';
import type { UserRelationType } from '@sker/sdk';

@Controller('api/user-relations')
export class UserRelationController {
  private userRelationService: UserRelationService;

  constructor() {
    this.userRelationService = root.get(UserRelationService);
  }

  @Get()
  async getNetwork(
    @Query('type') type?: UserRelationType,
    @Query('timeRange') timeRange?: TimeRange,
    @Query('minWeight') minWeight?: string,
    @Query('limit') limit?: string
  ) {
    return this.userRelationService.getNetwork({
      type,
      timeRange,
      minWeight: minWeight ? parseInt(minWeight, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
