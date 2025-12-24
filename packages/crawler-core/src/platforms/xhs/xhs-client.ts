import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import type { Page } from 'playwright'
import crypto from 'crypto'

interface XhsResponse<T = any> {
  success?: boolean
  code?: number
  msg?: string
  data?: T
}

interface SignResult {
  'x-s': string
  'x-t': string
  'x-s-common': string
  'x-b3-traceid': string
}

@Injectable()
export class XhsClient {
  private readonly baseURL = 'https://edith.xiaohongshu.com'
  private readonly domain = 'https://www.xiaohongshu.com'
  private httpClient: HttpClient
  private page?: Page
  private cookieDict: Record<string, string> = {}

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
        'Referer': 'https://www.xiaohongshu.com/',
      },
    })
  }

  setPage(page: Page) {
    this.page = page
  }

  private buildSignString(uri: string, data: any, method: string): string {
    if (method === 'POST') {
      return uri + JSON.stringify(data)
    }
    if (!data || Object.keys(data).length === 0) return uri
    const params = Object.entries(data)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&')
    return `${uri}?${params}`
  }

  private md5(str: string): string {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex')
  }

  private base64Encode(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64')
  }

  private buildXsPayload(x3: string): string {
    const payload = {
      x0: '4.2.1',
      x1: 'xhs-pc-web',
      x2: 'Mac OS',
      x3,
      x4: 'object',
    }
    return 'XYS_' + this.base64Encode(JSON.stringify(payload))
  }

  private buildXsCommon(a1: string, b1: string, xs: string, xt: string): string {
    const mrc = (input: string) => {
      return crypto.createHash('md5').update(input).digest('hex').slice(0, 8)
    }
    const payload = {
      s0: 3,
      s1: '',
      x0: '1',
      x1: '4.2.2',
      x2: 'Mac OS',
      x3: 'xhs-pc-web',
      x4: '4.74.0',
      x5: a1,
      x6: xt,
      x7: xs,
      x8: b1,
      x9: mrc(xt + xs + b1),
      x10: 154,
      x11: 'normal',
    }
    return this.base64Encode(JSON.stringify(payload))
  }

  private async getB1FromLocalStorage(): Promise<string> {
    if (!this.page) return ''
    try {
      const b1 = await this.page.evaluate(() => window.localStorage.getItem('b1'))
      return b1 || ''
    } catch {
      return ''
    }
  }

  private async callMnsv2(signStr: string, md5Str: string): Promise<string> {
    if (!this.page) return ''
    try {
      const result = await this.page.evaluate(
        (args) => (window as any).mnsv2(args.signStr, args.md5Str),
        { signStr, md5Str }
      )
      return result || ''
    } catch {
      return ''
    }
  }

  private async generateSign(uri: string, data: any, method: string): Promise<SignResult> {
    const signStr = this.buildSignString(uri, data, method)
    const md5Str = this.md5(signStr)
    const x3 = await this.callMnsv2(signStr, md5Str)
    const xs = this.buildXsPayload(x3)
    const xt = String(Date.now())
    const a1 = this.cookieDict.a1 || ''
    const b1 = await this.getB1FromLocalStorage()
    const xsCommon = this.buildXsCommon(a1, b1, xs, xt)
    const traceId = crypto.randomBytes(16).toString('hex')

    return {
      'x-s': xs,
      'x-t': xt,
      'x-s-common': xsCommon,
      'x-b3-traceid': traceId,
    }
  }

  async request<T>(method: string, uri: string, data?: any): Promise<T> {
    const sign = await this.generateSign(uri, data, method)
    const headers = { ...sign }
    const fullUrl = `${this.baseURL}${uri}`

    const response =
      method === 'GET'
        ? await this.httpClient.get<XhsResponse<T>>(fullUrl, { headers, params: data })
        : await this.httpClient.post<XhsResponse<T>>(fullUrl, data, { headers })

    const result = response.data
    if (result.success) {
      return (result.data || result.success) as T
    }
    throw new Error(result.msg || 'Request failed')
  }

  async searchNotes(keyword: string, page = 1, pageSize = 20) {
    return this.request('POST', '/api/sns/web/v1/search/notes', {
      keyword,
      page,
      page_size: pageSize,
      search_id: crypto.randomBytes(16).toString('hex'),
      sort: 'general',
      note_type: 0,
    })
  }

  async getNoteDetail(noteId: string, xsecSource = 'pc_search', xsecToken = '') {
    const result = await this.request('POST', '/api/sns/web/v1/feed', {
      source_note_id: noteId,
      image_formats: ['jpg', 'webp', 'avif'],
      extra: { need_body_topic: 1 },
      xsec_source: xsecSource,
      xsec_token: xsecToken,
    })
    return (result as any)?.items?.[0]?.note_card || {}
  }

  async getComments(noteId: string, xsecToken = '', cursor = '') {
    return this.request('GET', '/api/sns/web/v2/comment/page', {
      note_id: noteId,
      cursor,
      top_comment_id: '',
      image_formats: 'jpg,webp,avif',
      xsec_token: xsecToken,
    })
  }

  async getCreatorInfo(userId: string) {
    const uri = `/user/profile/${userId}`
    const html = await this.httpClient.get<string>(`${this.domain}${uri}`, {
      headers: this.httpClient['axiosInstance'].defaults.headers as any,
    })
    return this.extractCreatorFromHtml(html.data)
  }

  private extractCreatorFromHtml(html: string): any {
    const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?})<\/script>/)
    if (!match) return {}
    try {
      const state = JSON.parse(match[1])
      return state.user?.userPageData || {}
    } catch {
      return {}
    }
  }

  async loadCookies(cookies: Record<string, string>) {
    this.cookieDict = cookies
    await this.httpClient.loadCookies(JSON.stringify(cookies))
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }
}
