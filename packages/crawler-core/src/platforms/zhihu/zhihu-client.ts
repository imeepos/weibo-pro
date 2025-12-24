import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import type { AxiosRequestConfig } from 'axios'
import type { Page } from 'playwright'
import { createHash } from 'crypto'

interface ZhihuResponse<T = any> {
  error?: { message: string }
  data?: T
  paging?: {
    is_end: boolean
    next?: string
  }
}

@Injectable()
export class ZhihuClient {
  private readonly baseURL = 'https://www.zhihu.com'
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
        'Accept': 'application/json',
        'Referer': 'https://www.zhihu.com/',
      },
    })
  }

  setPage(page: Page) {
    this.page = page
  }

  private async sign(url: string): Promise<Record<string, string>> {
    const d_c0 = await this.getCookie('d_c0')
    if (!d_c0) throw new Error('d_c0 cookie not found')

    const timestamp = Date.now()
    const hash = createHash('md5')
      .update(`${url}${d_c0}${timestamp}`)
      .digest('hex')

    return {
      'x-zse-96': `2.0_${hash}`,
      'x-zst-81': timestamp.toString(),
    }
  }

  private async getCookie(name: string): Promise<string | undefined> {
    const cookies = await this.httpClient.saveCookies()
    if (!cookies) return undefined
    const parsed = JSON.parse(cookies)
    return parsed[name]
  }

  private async request<T>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const finalUrl = params ? `${url}?${new URLSearchParams(params).toString()}` : url
    const signHeaders = await this.sign(finalUrl)

    const response = await this.httpClient.get<ZhihuResponse<T>>(url, {
      ...config,
      params,
      headers: {
        ...config?.headers,
        ...signHeaders,
      },
    })

    const data = response.data
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.data as T
  }

  async searchQuestions(keyword: string, offset = 0, limit = 20) {
    return this.request('/api/v4/search_v3', {
      t: 'general',
      q: keyword,
      correction: 1,
      offset,
      limit,
      filter_fields: '',
      lc_idx: offset,
      show_all_topics: 0,
      search_source: 'Filter',
    })
  }

  async getAnswerDetail(questionId: string, answerId: string) {
    return this.request(`/api/v4/answers/${answerId}`, {
      include: 'content,voteup_count,comment_count,created_time,updated_time,excerpt',
    })
  }

  async getRootComments(contentId: string, contentType: string, offset = '', limit = 10) {
    return this.request(`/api/v4/comment_v5/${contentType}s/${contentId}/root_comment`, {
      order: 'score',
      offset,
      limit,
    })
  }

  async getCreatorInfo(urlToken: string) {
    return this.request(`/api/v4/members/${urlToken}`, {
      include: 'follower_count,following_count,answer_count,articles_count,voteup_count',
    })
  }

  async loadCookies(cookies: Record<string, string>) {
    await this.httpClient.loadCookies(JSON.stringify(cookies))
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }
}
