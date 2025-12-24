import { Injectable } from '@sker/core'
import axios, { AxiosInstance } from 'axios'
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
  MediaPlatform
} from '@sker/sdk'

@Injectable()
export class MediaCrawlerProxyService {
  private axiosInstance: AxiosInstance

  constructor() {
    const mediaCrawlerApiUrl = process.env.MEDIA_CRAWLER_API_URL || 'http://localhost:8080'

    this.axiosInstance = axios.create({
      baseURL: mediaCrawlerApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async startCrawler(request: CrawlerStartRequest): Promise<{ status: string; message: string }> {
    const payload = {
      platform: request.platform,
      login_type: request.loginType || 'qrcode',
      crawler_type: request.crawlerType || 'search',
      keywords: request.keywords || '',
      specified_ids: request.specifiedIds || '',
      creator_ids: request.creatorIds || '',
      start_page: request.startPage || 1,
      enable_comments: request.enableComments !== false,
      enable_sub_comments: request.enableSubComments || false,
      save_option: request.saveOption || 'json',
      cookies: request.cookies || '',
      headless: request.headless || false
    }

    const response = await this.axiosInstance.post('/api/crawler/start', payload)
    return response.data
  }

  async stopCrawler(): Promise<{ status: string; message: string }> {
    const response = await this.axiosInstance.post('/api/crawler/stop')
    return response.data
  }

  async getCrawlerStatus(): Promise<CrawlerStatusResponse> {
    const response = await this.axiosInstance.get('/api/crawler/status')
    return response.data
  }

  async getCrawlerLogs(limit?: number): Promise<{ logs: CrawlerLogEntry[] }> {
    const response = await this.axiosInstance.get('/api/crawler/logs', {
      params: { limit: limit || 100 }
    })
    return response.data
  }

  async getDataFiles(platform?: string, fileType?: string): Promise<DataFileListResponse> {
    const response = await this.axiosInstance.get('/api/data/files', {
      params: { platform, file_type: fileType }
    })
    return response.data
  }

  async getDataFileContent(
    filePath: string,
    preview?: boolean,
    limit?: number
  ): Promise<DataFileContentResponse> {
    const response = await this.axiosInstance.get(`/api/data/files/${filePath}`, {
      params: { preview, limit }
    })
    return response.data
  }

  async getDataStats(): Promise<DataStats> {
    const response = await this.axiosInstance.get('/api/data/stats')
    return response.data
  }

  async checkEnvironment(): Promise<EnvCheckResult> {
    const response = await this.axiosInstance.get('/api/env/check')
    return response.data
  }

  async getPlatforms(): Promise<{ platforms: PlatformInfo[] }> {
    const response = await this.axiosInstance.get('/api/config/platforms')
    return response.data
  }

  async getConfigOptions(): Promise<{
    loginTypes: ConfigOption[]
    crawlerTypes: ConfigOption[]
    saveOptions: ConfigOption[]
  }> {
    const response = await this.axiosInstance.get('/api/config/options')
    return response.data
  }

  async getLoginQRCode(platform: MediaPlatform): Promise<QRCodeData> {
    const response = await this.axiosInstance.get('/api/login/qrcode', {
      params: { platform }
    })
    return response.data
  }

  async getLoginStatus(platform: MediaPlatform): Promise<LoginStatusResponse> {
    const response = await this.axiosInstance.get('/api/login/status', {
      params: { platform }
    })
    return response.data
  }

  async loginWithCookie(request: CookieLoginRequest): Promise<{ status: string; message: string }> {
    const response = await this.axiosInstance.post('/api/login/cookie', request)
    return response.data
  }
}
