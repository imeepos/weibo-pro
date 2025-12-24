import { Controller, Get, Query } from '@sker/core'
import type {
  UserRelationNetwork,
  UserRelationType,
  TimeRange
} from '../types'

@Controller('user-relations')
export class UserRelationController {

  @Get('list')
  getNetwork(
    @Query('type') type?: UserRelationType,
    @Query('timeRange') timeRange?: TimeRange,
    @Query('minWeight') minWeight?: number,
    @Query('limit') limit?: number
  ): Promise<UserRelationNetwork> {
    throw new Error('method getNetwork not implements')
  }
}
