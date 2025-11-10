import { Controller, Get, Query } from '@sker/core'
import type { TimeRange } from '@sker/entities';

@Controller('api/users')
export class UsersController {

  @Get('list')
  getUserList(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getUserList not implements')
  }

  @Get('risk-levels')
  getRiskLevels(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getRiskLevels not implements')
  }

  @Get('statistics')
  getStatistics(@Query('timeRange') timeRange?: TimeRange): Promise<any> {
    throw new Error('method getStatistics not implements')
  }
}