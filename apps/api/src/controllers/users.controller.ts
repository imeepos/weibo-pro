import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { UsersService } from '../services/data/users.service';

@Controller('api/users')
export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = root.get(UsersService);
  }

  @Get('list')
  async getUserList(@Query('timeRange') timeRange?: string) {
    return this.usersService.getUserList(timeRange);
  }

  @Get('risk-levels')
  async getRiskLevels(@Query('timeRange') timeRange?: string) {
    return this.usersService.getRiskLevels(timeRange);
  }

  @Get('statistics')
  async getStatistics(@Query('timeRange') timeRange?: string) {
    return this.usersService.getStatistics(timeRange);
  }
}