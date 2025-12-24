import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import type { AxiosRequestConfig } from 'axios'
import type { Page } from 'playwright'
import { createHash } from 'crypto'

interface BilibiliResponse<T = any> {
  code: number
  message?: string
  data?: T
}

class WbiSign {
  private readonly mapTable = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52,
  ]

  constructor(
    private imgKey: string,
    private subKey: string,
  ) {}

  private getSalt(): string {
    const mixinKey = this.imgKey + this.subKey
    return this.mapTable.map(i => mixinKey[i]).join('').slice(0, 32)
  }

  sign(params: Record<string, any>): Record<string, any> {
    const wts = Math.floor(Date.now() / 1000)
    const data: Record<string, any> = { ...params, wts }

    const sorted = Object.keys(data)
      .sort()
      .reduce((acc, key) => {
        const value = String(data[key]).replace(/[!'()*]/g, '')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

    const query = new URLSearchParams(sorted).toString()
    const salt = this.getSalt()
    const wRid = createHash('md5').update(query + salt).digest('hex')

    return { ...sorted, w_rid: wRid }
  }
}

@Injectable()
export class BilibiliClient {
  private readonly baseURL = 'https://api.bilibili.com'
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
        'Referer': 'https://www.bilibili.com/',
      },
    })
  }

  setPage(page: Page) {
    this.page = page
  }

  private async getWbiKeys(): Promise<[string, string]> {
    if (!this.page) {
      const resp = await this.request<any>('/x/web-interface/nav', {}, false)
      const imgUrl = resp.wbi_img.img_url
      const subUrl = resp.wbi_img.sub_url
      return [
        imgUrl.split('/').pop()!.split('.')[0],
        subUrl.split('/').pop()!.split('.')[0],
      ]
    }

    const localStorage = await this.page.evaluate(() => window.localStorage)
    const wbiImgUrls = localStorage.wbi_img_urls || ''

    if (wbiImgUrls && wbiImgUrls.includes('-')) {
      const [imgUrl, subUrl] = wbiImgUrls.split('-')
      return [
        imgUrl.split('/').pop()!.split('.')[0],
        subUrl.split('/').pop()!.split('.')[0],
      ]
    }

    const resp = await this.request<any>('/x/web-interface/nav', {}, false)
    return [
      resp.wbi_img.img_url.split('/').pop()!.split('.')[0],
      resp.wbi_img.sub_url.split('/').pop()!.split('.')[0],
    ]
  }

  private async request<T>(
    url: string,
    params?: Record<string, any>,
    enableSign = true,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    let finalParams = params

    if (enableSign && params) {
      const [imgKey, subKey] = await this.getWbiKeys()
      const signer = new WbiSign(imgKey, subKey)
      finalParams = signer.sign(params)
    }

    const response = await this.httpClient.get<BilibiliResponse<T>>(url, {
      ...config,
      params: finalParams,
    })

    const data = response.data
    if (data.code !== 0) {
      throw new Error(data.message || 'Request failed')
    }

    return data.data as T
  }

  async searchVideos(keyword: string, page = 1, pageSize = 20) {
    return this.request('/x/web-interface/wbi/search/type', {
      search_type: 'video',
      keyword,
      page,
      page_size: pageSize,
      order: 'totalrank',
    })
  }

  async getVideoDetail(bvid: string) {
    return this.request('/x/web-interface/view/detail', { bvid }, false)
  }

  async getComments(videoId: string, next = 0) {
    return this.request('/x/v2/reply/wbi/main', {
      oid: videoId,
      type: 1,
      mode: 3,
      ps: 20,
      next,
    })
  }

  async getCreatorInfo(mid: number) {
    return this.request('/x/space/wbi/acc/info', { mid })
  }

  async loadCookies(cookies: Record<string, string>) {
    await this.httpClient.loadCookies(JSON.stringify(cookies))
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }
}
