import { Controller, Query } from '@sker/core';
import { root } from '@sker/core';
import { UserRelationService } from '../services/data/user-relation.service';
import type { TimeRange } from '@sker/entities';
import type { UserRelationType } from '@sker/sdk';
import * as sdk from '@sker/sdk';

@Controller(sdk.UserRelationController)
export class UserRelationController implements sdk.UserRelationController {
  private userRelationService: UserRelationService;

  constructor() {
    this.userRelationService = root.get(UserRelationService);
  }

  async getNetwork(
    @Query('type') type?: UserRelationType,
    @Query('timeRange') timeRange?: TimeRange,
    @Query('eventId') eventId?: string,
    @Query('minWeight') minWeight?: number,
    @Query('limit') limit?: number
  ): Promise<sdk.UserRelationNetwork> {
    return this.userRelationService.getNetwork({
      type,
      timeRange,
      eventId,
      minWeight: minWeight,
      limit: limit,
    });
  }
}
