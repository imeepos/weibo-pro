import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import type { AxiosRequestConfig } from 'axios'
import type { Page } from 'playwright'

interface DouyinResponse<T = any> {
  status_code?: number
  data?: T
  status_msg?: string
}

@Injectable()
export class DouyinClient {
  private readonly baseURL = 'https://www.douyin.com'
  private httpClient: HttpClient
  private page?: Page

  constructor() {
    this.httpClient = new HttpClient({
      baseURL: this.baseURL,
      timeout: 60000,
      enableCookies: true,
      enableLogging: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.douyin.com/',
      },
    })
  }

  setPage(page: Page) {
    this.page = page
  }

  private async getCommonParams(): Promise<Record<string, string>> {
    return {
      device_platform: 'webapp',
      aid: '6383',
      channel: 'channel_pc_web',
      version_code: '190600',
      version_name: '19.6.0',
      cookie_enabled: 'true',
      browser_language: 'zh-CN',
      browser_platform: 'MacIntel',
      browser_name: 'Chrome',
      browser_version: '125.0.0.0',
      platform: 'PC',
    }
  }

  async request<T>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<T> {
    const commonParams = await this.getCommonParams()
    const fullParams = { ...commonParams, ...params }

    const response = await this.httpClient.get<DouyinResponse<T>>(url, {
      ...config,
      params: fullParams,
    })

    const data = response.data
    if (data.status_code !== undefined && data.status_code !== 0) {
      throw new Error(data.status_msg || 'Request failed')
    }

    return (data.data || data) as T
  }

  async searchVideos(keyword: string, offset = 0, count = 15) {
    return this.request('/aweme/v1/web/general/search/single/', {
      search_channel: 'aweme_video_web',
      enable_history: '1',
      keyword,
      search_source: 'tab_search',
      query_correct_type: '1',
      is_filter_search: '0',
      offset,
      count,
      need_filter_settings: '1',
      list_type: 'multi',
    })
  }

  async getVideoDetail(awemeId: string) {
    return this.request('/aweme/v1/web/aweme/detail/', { aweme_id: awemeId })
  }

  async getComments(awemeId: string, cursor = 0, count = 20) {
    return this.request('/aweme/v1/web/comment/list/', {
      aweme_id: awemeId,
      cursor,
      count,
      item_type: 0,
    })
  }

  async getCreatorInfo(secUid: string) {
    return this.request('/aweme/v1/web/aweme/post/', {
      sec_user_id: secUid,
      count: 10,
      max_cursor: 0,
    })
  }

  async loadCookies(cookies: Record<string, string>) {
    await this.httpClient.loadCookies(JSON.stringify(cookies))
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }
}
