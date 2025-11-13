import { Controller, Get, Query } from '@sker/core'
import type {
  UserRelationNetwork,
  UserRelationType,
  TimeRange
} from '../types'

@Controller('api/user-relations')
export class UserRelationController {

  @Get()
  getNetwork(
    @Query('type') type?: UserRelationType,
    @Query('timeRange') timeRange?: TimeRange,
    @Query('minWeight') minWeight?: number,
    @Query('limit') limit?: number
  ): Promise<UserRelationNetwork> {
    throw new Error('method getNetwork not implements')
  }
}
