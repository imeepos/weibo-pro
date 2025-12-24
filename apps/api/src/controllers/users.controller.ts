import { Controller, Get, Query } from '@sker/core';
import { root } from '@sker/core';
import { UsersService } from '../services/data/users.service';
import type { TimeRange } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller(sdk.UsersController)
export class UsersController implements sdk.UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = root.get(UsersService);
  }

  async getUserList(
    @Query('timeRange') timeRange?: TimeRange,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    return this.usersService.getUserList(timeRange, page, pageSize);
  }

  async getRiskLevels(@Query('timeRange') timeRange?: TimeRange) {
    return this.usersService.getRiskLevels(timeRange);
  }

  async getStatistics(@Query('timeRange') timeRange?: TimeRange) {
    return this.usersService.getStatistics(timeRange);
  }
}