import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import type { AxiosRequestConfig } from 'axios'

export enum SearchType {
  DEFAULT = '1',
  REALTIME = '61',
  HOT = '60',
  ORIGINAL = '62',
}

interface WeiboResponse<T = any> {
  ok: number
  data?: T
  msg?: string
}

@Injectable()
export class WeiboClient {
  private readonly baseURL = 'https://m.weibo.cn'
  private httpClient: HttpClient

  constructor() {
    this.httpClient = new HttpClient({
      baseURL: this.baseURL,
      timeout: 60000,
      enableCookies: true,
      enableLogging: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    })
  }

  async request<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.httpClient.get<WeiboResponse<T>>(url, config)
    const data = response.data

    if (data.ok === 0) {
      throw new Error(data.msg || 'Response error')
    }
    if (data.ok !== 1) {
      throw new Error(data.msg || 'Unknown error')
    }

    return data.data as T
  }

  async pong(): Promise<boolean> {
    try {
      const data = await this.request<{ login: boolean }>('/api/config')
      return data.login
    } catch {
      return false
    }
  }

  async searchByKeyword(keyword: string, page = 1, searchType = SearchType.DEFAULT) {
    const containerid = `100103type=${searchType}&q=${keyword}`
    return this.request('/api/container/getIndex', {
      params: { containerid, page_type: 'searchall', page },
    })
  }

  async getNoteDetail(noteId: string) {
    const response = await this.httpClient.get(`/detail/${noteId}`, { return_response: true } as any)
    const html = response.data as string
    const match = html.match(/var \$render_data = (\[.*?\])\[0\]/)
    if (!match) return null

    const renderData = JSON.parse(match[1]!)
    return { mblog: renderData[0].status }
  }

  async getComments(noteId: string, maxId = 0, maxIdType = 0) {
    return this.request('/comments/hotflow', {
      params: { id: noteId, mid: noteId, max_id_type: maxIdType, ...(maxId > 0 && { max_id: maxId }) },
      headers: { Referer: `${this.baseURL}/detail/${noteId}` },
    })
  }

  async getCreatorInfo(creatorId: string) {
    const containerid = `100505${creatorId}`
    return this.request('/api/container/getIndex', {
      params: { jumpfrom: 'weibocom', type: 'uid', value: creatorId, containerid },
    })
  }

  async loadCookies(cookies: Record<string, string>) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
    await this.httpClient.loadCookies(JSON.stringify(cookies))
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }
}
