import { Body, Controller, Get, Param, Post, Query } from '@sker/core'
import type { TimeRange } from '@sker/entities';
import type {
  CreateDistillationTaskRequest,
  DistillationTaskSummary,
  UserListResponse,
  UserInvestigationDossier,
  UserInvestigationQueueResponse,
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

  @Get('investigation-queue')
  getInvestigationQueue(
    @Query('eventId') eventId?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ): Promise<UserInvestigationQueueResponse> {
    throw new Error('method getInvestigationQueue not implements')
  }

  @Get(':id/dossier')
  getUserDossier(
    @Param('id') id: string,
    @Query('eventId') eventId?: string,
    @Query('windowDays') windowDays?: number,
  ): Promise<UserInvestigationDossier> {
    throw new Error('method getUserDossier not implements')
  }

  @Post(':id/distillation-tasks')
  createDistillationTask(
    @Param('id') id: string,
    @Body() request?: CreateDistillationTaskRequest,
  ): Promise<DistillationTaskSummary> {
    throw new Error('method createDistillationTask not implements')
  }

  @Get(':id/distillation-tasks')
  getDistillationTasks(@Param('id') id: string): Promise<DistillationTaskSummary[]> {
    throw new Error('method getDistillationTasks not implements')
  }
}
