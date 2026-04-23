import { Body, Controller, Get, Param, Post, Query } from '@sker/core';
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

  async getInvestigationQueue(
    @Query('eventId') eventId?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.usersService.getInvestigationQueue({ eventId, riskLevel, status, page, pageSize });
  }

  async getUserDossier(
    @Param('id') id: string,
    @Query('eventId') eventId?: string,
    @Query('windowDays') windowDays: number = 90,
  ) {
    return this.usersService.getUserDossier(id, eventId, windowDays);
  }

  async createDistillationTask(
    @Param('id') id: string,
    @Body() request?: sdk.CreateDistillationTaskRequest,
  ) {
    return this.usersService.createDistillationTask(id, request);
  }

  async getDistillationTasks(@Param('id') id: string) {
    return this.usersService.getDistillationTasks(id);
  }
}
