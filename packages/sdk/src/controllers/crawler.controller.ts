import { Controller, Post, Get, Body, Param } from '@sker/core'
import type { CrawlerStartRequest } from '../types'

/**
 * 爬虫状态详情响应
 */
export interface CrawlerStatusDetail {
  id: string
  platform: string
  status: 'running' | 'stopped' | 'error'
  startedAt?: string
  errorMessage?: string
}

/**
 * 爬虫列表项
 */
export interface CrawlerListItem {
  id: string
  platform: string
  status: string
  createdAt: string
}

/**
 * 爬虫任务控制器 SDK
 * 用于管理爬虫任务的启动、停止和状态查询
 */
@Controller('crawler')
export class CrawlerController {
  /**
   * 启动爬虫任务
   * @param request 爬虫启动请求参数
   */
  @Post('start')
  start(@Body() request: CrawlerStartRequest): Promise<{ id: string; status: string; message: string }> {
    throw new Error('method start not implements')
  }

  /**
   * 获取爬虫任务状态
   * @param id 任务 ID
   */
  @Get('status/:id')
  getStatus(@Param('id') id: string): Promise<CrawlerStatusDetail> {
    throw new Error('method getStatus not implements')
  }

  /**
   * 停止爬虫任务
   * @param id 任务 ID
   */
  @Post('stop/:id')
  stop(@Param('id') id: string): Promise<{ status: string; message: string }> {
    throw new Error('method stop not implements')
  }

  /**
   * 获取所有爬虫任务列表
   */
  @Get('list')
  list(): Promise<{ crawlers: CrawlerListItem[] }> {
    throw new Error('method list not implements')
  }
}
