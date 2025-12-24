import { Controller, Get, Post, Body, Query } from '@sker/core'
import type {
  CrawlerStartRequest,
  CrawlerStatusResponse,
  CrawlerLogEntry,
  PlatformInfo,
  ConfigOption,
  DataFileInfo,
  DataFileListResponse,
  DataFileContentResponse,
  DataStats,
  EnvCheckResult,
  QRCodeData,
  LoginStatusResponse,
  CookieLoginRequest,
  MediaPlatform
} from '../types'

@Controller('media-crawler')
export class MediaCrawlerController {

  @Post('crawler/start')
  startCrawler(@Body() request: CrawlerStartRequest): Promise<{ status: string; message: string }> {
    throw new Error('method startCrawler not implements')
  }

  @Post('crawler/stop')
  stopCrawler(): Promise<{ status: string; message: string }> {
    throw new Error('method stopCrawler not implements')
  }

  @Get('crawler/status')
  getCrawlerStatus(): Promise<CrawlerStatusResponse> {
    throw new Error('method getCrawlerStatus not implements')
  }

  @Get('crawler/logs')
  getCrawlerLogs(@Query('limit') limit?: number): Promise<{ logs: CrawlerLogEntry[] }> {
    throw new Error('method getCrawlerLogs not implements')
  }

  @Get('data/files')
  getDataFiles(
    @Query('platform') platform?: string,
    @Query('file_type') fileType?: string
  ): Promise<DataFileListResponse> {
    throw new Error('method getDataFiles not implements')
  }

  @Get('data/files/:filePath')
  getDataFileContent(
    @Query('filePath') filePath: string,
    @Query('preview') preview?: boolean,
    @Query('limit') limit?: number
  ): Promise<DataFileContentResponse> {
    throw new Error('method getDataFileContent not implements')
  }

  @Get('data/stats')
  getDataStats(): Promise<DataStats> {
    throw new Error('method getDataStats not implements')
  }

  @Get('env/check')
  checkEnvironment(): Promise<EnvCheckResult> {
    throw new Error('method checkEnvironment not implements')
  }

  @Get('config/platforms')
  getPlatforms(): Promise<{ platforms: PlatformInfo[] }> {
    throw new Error('method getPlatforms not implements')
  }

  @Get('config/options')
  getConfigOptions(): Promise<{
    loginTypes: ConfigOption[]
    crawlerTypes: ConfigOption[]
    saveOptions: ConfigOption[]
  }> {
    throw new Error('method getConfigOptions not implements')
  }

  @Get('login/qrcode')
  getLoginQRCode(@Query('platform') platform: MediaPlatform): Promise<QRCodeData> {
    throw new Error('method getLoginQRCode not implements')
  }

  @Get('login/status')
  getLoginStatus(@Query('platform') platform: MediaPlatform): Promise<LoginStatusResponse> {
    throw new Error('method getLoginStatus not implements')
  }

  @Post('login/cookie')
  loginWithCookie(@Body() request: CookieLoginRequest): Promise<{ status: string; message: string }> {
    throw new Error('method loginWithCookie not implements')
  }
}
