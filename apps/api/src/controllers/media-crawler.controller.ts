import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { MediaCrawlerProxyService } from '../services/media-crawler-proxy.service'

@Controller('api/media-crawler')
export class MediaCrawlerController implements sdk.MediaCrawlerController {
  private proxyService: MediaCrawlerProxyService

  constructor() {
    this.proxyService = root.get(MediaCrawlerProxyService)
  }

  @Post('crawler/start')
  async startCrawler(@Body() request: sdk.CrawlerStartRequest): Promise<{ status: string; message: string }> {
    return this.proxyService.startCrawler(request)
  }

  @Post('crawler/stop')
  async stopCrawler(): Promise<{ status: string; message: string }> {
    return this.proxyService.stopCrawler()
  }

  @Get('crawler/status')
  async getCrawlerStatus(): Promise<sdk.CrawlerStatusResponse> {
    return this.proxyService.getCrawlerStatus()
  }

  @Get('crawler/logs')
  async getCrawlerLogs(@Query('limit') limit?: number): Promise<{ logs: sdk.CrawlerLogEntry[] }> {
    return this.proxyService.getCrawlerLogs(limit)
  }

  @Get('data/files')
  async getDataFiles(
    @Query('platform') platform?: string,
    @Query('file_type') fileType?: string
  ): Promise<sdk.DataFileListResponse> {
    return this.proxyService.getDataFiles(platform, fileType)
  }

  @Get('data/files/:filePath')
  async getDataFileContent(
    @Query('filePath') filePath: string,
    @Query('preview') preview?: boolean,
    @Query('limit') limit?: number
  ): Promise<sdk.DataFileContentResponse> {
    return this.proxyService.getDataFileContent(filePath, preview, limit)
  }

  @Get('data/stats')
  async getDataStats(): Promise<sdk.DataStats> {
    return this.proxyService.getDataStats()
  }

  @Get('env/check')
  async checkEnvironment(): Promise<sdk.EnvCheckResult> {
    return this.proxyService.checkEnvironment()
  }

  @Get('config/platforms')
  async getPlatforms(): Promise<{ platforms: sdk.PlatformInfo[] }> {
    return this.proxyService.getPlatforms()
  }

  @Get('config/options')
  async getConfigOptions(): Promise<{
    loginTypes: sdk.ConfigOption[]
    crawlerTypes: sdk.ConfigOption[]
    saveOptions: sdk.ConfigOption[]
  }> {
    return this.proxyService.getConfigOptions()
  }
}
