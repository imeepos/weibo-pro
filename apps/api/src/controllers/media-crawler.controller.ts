import { Controller, Body, Query } from '@sker/core'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { MediaCrawlerService } from '../services/media-crawler.service'

@Controller(sdk.MediaCrawlerController)
export class MediaCrawlerController implements sdk.MediaCrawlerController {
  private crawlerService: MediaCrawlerService

  constructor() {
    this.crawlerService = root.get(MediaCrawlerService)
  }

  async startCrawler(@Body() request: sdk.CrawlerStartRequest): Promise<{ status: string; message: string }> {
    return this.crawlerService.startCrawler(request)
  }

  async stopCrawler(): Promise<{ status: string; message: string }> {
    return this.crawlerService.stopCrawler()
  }

  async getCrawlerStatus(): Promise<sdk.CrawlerStatusResponse> {
    return this.crawlerService.getCrawlerStatus()
  }

  async getCrawlerLogs(@Query('limit') limit?: number): Promise<{ logs: sdk.CrawlerLogEntry[] }> {
    return this.crawlerService.getCrawlerLogs(limit)
  }

  async getDataFiles(
    @Query('platform') platform?: string,
    @Query('file_type') fileType?: string
  ): Promise<sdk.DataFileListResponse> {
    return this.crawlerService.getDataFiles(platform, fileType)
  }

  async getDataFileContent(
    @Query('filePath') filePath: string,
    @Query('preview') preview?: boolean,
    @Query('limit') limit?: number
  ): Promise<sdk.DataFileContentResponse> {
    return this.crawlerService.getDataFileContent(filePath, preview, limit)
  }

  async getDataStats(): Promise<sdk.DataStats> {
    return this.crawlerService.getDataStats()
  }

  async checkEnvironment(): Promise<sdk.EnvCheckResult> {
    return this.crawlerService.checkEnvironment()
  }

  async getPlatforms(): Promise<{ platforms: sdk.PlatformInfo[] }> {
    return this.crawlerService.getPlatforms()
  }

  async getConfigOptions(): Promise<{
    loginTypes: sdk.ConfigOption[]
    crawlerTypes: sdk.ConfigOption[]
    saveOptions: sdk.ConfigOption[]
  }> {
    return this.crawlerService.getConfigOptions()
  }

  async getLoginQRCode(@Query('platform') platform: sdk.MediaPlatform): Promise<sdk.QRCodeData> {
    return this.crawlerService.getLoginQRCode(platform)
  }

  async getLoginStatus(@Query('platform') platform: sdk.MediaPlatform): Promise<sdk.LoginStatusResponse> {
    return this.crawlerService.getLoginStatus(platform)
  }

  async loginWithCookie(@Body() request: sdk.CookieLoginRequest): Promise<{ status: string; message: string }> {
    return this.crawlerService.loginWithCookie(request)
  }
}
