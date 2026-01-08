import { Controller, Post, Body, Get, Param, Query } from '@sker/core'
import { Observable } from 'rxjs'
import type {
  PromptOptimizationTaskEntity,
  PromptVersionEntity,
  OptimizationTaskStatus
} from '@sker/entities'
import type { NodeEvent } from '@sker/workflow'

export interface CreateOptimizationTaskPayload {
  name: string
  targetOutput: string
  targetContext?: string
  initialPrompt?: string
  evaluationCriteria?: Record<string, number>
  optimizationConfig?: {
    maxIterations?: number
    targetScore?: number
    model?: string
    temperature?: number
    testRuns?: number
  }
}

export interface QuickOptimizePayload {
  targetOutput: string
  targetContext?: string
  initialPrompt?: string
  maxIterations?: number
  targetScore?: number
}

export interface ListTasksResult {
  tasks: PromptOptimizationTaskEntity[]
  total: number
}

@Controller('prompt-optimizer')
export class PromptOptimizerController {
  @Post('/tasks')
  createTask(@Body() body: CreateOptimizationTaskPayload): Promise<PromptOptimizationTaskEntity> {
    throw new Error('method createTask not implements')
  }

  @Get('/tasks/:taskId')
  getTask(@Param('taskId') taskId: string): Promise<PromptOptimizationTaskEntity> {
    throw new Error('method getTask not implements')
  }

  @Get('/tasks')
  listTasks(@Query() query: { status?: OptimizationTaskStatus; page?: number; pageSize?: number }): Promise<ListTasksResult> {
    throw new Error('method listTasks not implements')
  }

  @Post({ path: '/tasks/:taskId/execute', sse: true })
  executeTask(@Param('taskId') taskId: string): Observable<NodeEvent> {
    throw new Error('method executeTask not implements')
  }

  @Get('/tasks/:taskId/versions')
  getVersions(@Param('taskId') taskId: string): Promise<PromptVersionEntity[]> {
    throw new Error('method getVersions not implements')
  }

  @Get('/tasks/:taskId/versions/:versionId')
  getVersion(@Param('taskId') taskId: string, @Param('versionId') versionId: string): Promise<PromptVersionEntity> {
    throw new Error('method getVersion not implements')
  }

  @Get('/tasks/:taskId/best')
  getBestVersion(@Param('taskId') taskId: string): Promise<PromptVersionEntity | null> {
    throw new Error('method getBestVersion not implements')
  }

  @Post({ path: '/quick', sse: true })
  quickOptimize(@Body() body: QuickOptimizePayload): Observable<NodeEvent> {
    throw new Error('method quickOptimize not implements')
  }
}
