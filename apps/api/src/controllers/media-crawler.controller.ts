import { Controller, Get, Post, Body, Query } from '@sker/core'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { MediaCrawlerProxyService } from '../services/media-crawler-proxy.service'

@Controller(sdk.MediaCrawlerController)
export class MediaCrawlerController implements sdk.MediaCrawlerController {
  private proxyService: MediaCrawlerProxyService

  constructor() {
    this.proxyService = root.get(MediaCrawlerProxyService)
  }

  async startCrawler(@Body() request: sdk.CrawlerStartRequest): Promise<{ status: string; message: string }> {
    return this.proxyService.startCrawler(request)
  }

  async stopCrawler(): Promise<{ status: string; message: string }> {
    return this.proxyService.stopCrawler()
  }

  async getCrawlerStatus(): Promise<sdk.CrawlerStatusResponse> {
    return this.proxyService.getCrawlerStatus()
  }

  async getCrawlerLogs(@Query('limit') limit?: number): Promise<{ logs: sdk.CrawlerLogEntry[] }> {
    return this.proxyService.getCrawlerLogs(limit)
  }

  async getDataFiles(
    @Query('platform') platform?: string,
    @Query('file_type') fileType?: string
  ): Promise<sdk.DataFileListResponse> {
    return this.proxyService.getDataFiles(platform, fileType)
  }

  async getDataFileContent(
    @Query('filePath') filePath: string,
    @Query('preview') preview?: boolean,
    @Query('limit') limit?: number
  ): Promise<sdk.DataFileContentResponse> {
    return this.proxyService.getDataFileContent(filePath, preview, limit)
  }

  async getDataStats(): Promise<sdk.DataStats> {
    return this.proxyService.getDataStats()
  }

  async checkEnvironment(): Promise<sdk.EnvCheckResult> {
    return this.proxyService.checkEnvironment()
  }

  async getPlatforms(): Promise<{ platforms: sdk.PlatformInfo[] }> {
    return this.proxyService.getPlatforms()
  }

  async getConfigOptions(): Promise<{
    loginTypes: sdk.ConfigOption[]
    crawlerTypes: sdk.ConfigOption[]
    saveOptions: sdk.ConfigOption[]
  }> {
    return this.proxyService.getConfigOptions()
  }
}
