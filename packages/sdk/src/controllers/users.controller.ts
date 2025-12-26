import { Controller, Get, Query } from '@sker/core'
import type { TimeRange } from '@sker/entities';
import type {
  UserListResponse,
  UserListQueryParams,
  RiskLevelConfig,
  UserStatistics
} from '../types'

@Controller('users')
export class UsersController {

  @Get('list')
  getUserList(
    @Query('timeRange') timeRange?: TimeRange,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ): Promise<UserListResponse> {
    throw new Error('method getUserList not implements')
  }

  @Get('risk-levels')
  getRiskLevels(@Query('timeRange') timeRange?: TimeRange): Promise<RiskLevelConfig[]> {
    throw new Error('method getRiskLevels not implements')
  }

  @Get('statistics')
  getStatistics(@Query('timeRange') timeRange?: TimeRange): Promise<UserStatistics> {
    throw new Error('method getStatistics not implements')
  }
}