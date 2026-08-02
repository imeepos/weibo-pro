import { Injectable } from '@sker/core'
import type {
  CrawlerStartRequest,
  CrawlerStatusResponse,
  CrawlerLogEntry,
  PlatformInfo,
  ConfigOption,
  DataFileListResponse,
  DataFileContentResponse,
  DataStats,
  EnvCheckResult,
  QRCodeData,
  LoginStatusResponse,
  CookieLoginRequest,
  MediaPlatform,
} from '@sker/sdk'

@Injectable()
export class MediaCrawlerService {
  private crawlerStatus: CrawlerStatusResponse = {
    status: 'idle',
    platform: undefined,
    crawlerType: undefined,
    startedAt: undefined,
  }

  private logs: CrawlerLogEntry[] = []

  async startCrawler(request: CrawlerStartRequest): Promise<{ status: string; message: string }> {
    try {
      this.crawlerStatus = {
        status: 'running',
        platform: request.platform,
        crawlerType: request.crawlerType || 'search',
        startedAt: new Date().toISOString(),
      }

      this.addLog('info', `Starting crawler for platform: ${request.platform}`)

      // TODO: 实际启动爬虫逻辑
      // 根据 platform 选择对应的爬虫实例
      // 例如: WeiboClient, DouyinClient 等

      return {
        status: 'success',
        message: 'Crawler started successfully',
      }
    } catch (error) {
      this.addLog('error', `Failed to start crawler: ${error}`)
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async stopCrawler(): Promise<{ status: string; message: string }> {
    this.crawlerStatus.status = 'idle'
    this.crawlerStatus.platform = undefined
    this.crawlerStatus.crawlerType = undefined
    this.addLog('info', 'Crawler stopped')

    return {
      status: 'success',
      message: 'Crawler stopped successfully',
    }
  }

  async getCrawlerStatus(): Promise<CrawlerStatusResponse> {
    return this.crawlerStatus
  }

  async getCrawlerLogs(limit?: number): Promise<{ logs: CrawlerLogEntry[] }> {
    const logs = limit ? this.logs.slice(-limit) : this.logs
    return { logs }
  }

  async getDataFiles(_platform?: string, _fileType?: string): Promise<DataFileListResponse> {
    // TODO: 实现文件列表查询
    return {
      files: [],
    }
  }

  async getDataFileContent(
    _filePath: string,
    _preview?: boolean,
    _limit?: number
  ): Promise<DataFileContentResponse> {
    // TODO: 实现文件内容读取
    return {
      data: [],
      total: 0,
      columns: [],
    }
  }

  async getDataStats(): Promise<DataStats> {
    // TODO: 实现统计数据
    return {
      totalFiles: 0,
      totalSize: 0,
      byPlatform: {},
      byType: {},
    }
  }

  async checkEnvironment(): Promise<EnvCheckResult> {
    return {
      success: true,
      message: 'Environment is healthy',
      output: `Node.js: ${process.version}\n@sker/crawler-core: Available`,
    }
  }

  async getPlatforms(): Promise<{ platforms: PlatformInfo[] }> {
    return {
      platforms: [
        { value: 'wb', label: '微博', icon: 'weibo' },
        { value: 'dy', label: '抖音', icon: 'douyin' },
        { value: 'xhs', label: '小红书', icon: 'xiaohongshu' },
        { value: 'bili', label: 'B站', icon: 'bilibili' },
        { value: 'zhihu', label: '知乎', icon: 'zhihu' },
        { value: 'tieba', label: '贴吧', icon: 'tieba' },
        { value: 'ks', label: '快手', icon: 'kuaishou' },
      ],
    }
  }

  async getConfigOptions(): Promise<{
    loginTypes: ConfigOption[]
    crawlerTypes: ConfigOption[]
    saveOptions: ConfigOption[]
  }> {
    return {
      loginTypes: [
        { value: 'qrcode', label: '扫码登录' },
        { value: 'cookie', label: 'Cookie 登录' },
      ],
      crawlerTypes: [
        { value: 'search', label: '关键词搜索' },
        { value: 'user', label: '用户主页' },
        { value: 'detail', label: '详情页' },
      ],
      saveOptions: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'excel', label: 'Excel' },
        { value: 'database', label: '数据库' },
      ],
    }
  }

  async getLoginQRCode(platform: MediaPlatform): Promise<QRCodeData> {
    // TODO: 实现二维码登录
    this.addLog('info', `Getting QR code for platform: ${platform}`)
    return {
      qrUrl: '',
    }
  }

  async getLoginStatus(_platform: MediaPlatform): Promise<LoginStatusResponse> {
    // TODO: 实现登录状态检查
    return {
      status: 'pending',
      message: 'Login status check not implemented yet',
    }
  }

  async loginWithCookie(request: CookieLoginRequest): Promise<{ status: string; message: string }> {
    // TODO: 实现 Cookie 登录
    this.addLog('info', `Login with cookie for platform: ${request.platform}`)
    return {
      status: 'success',
      message: 'Cookie login not implemented yet',
    }
  }

  private addLog(level: 'info' | 'error' | 'warning', message: string) {
    this.logs.push({
      id: this.logs.length + 1,
      level,
      message,
      timestamp: new Date().toISOString(),
    })
    // 保留最近 1000 条日志
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }
  }
}
