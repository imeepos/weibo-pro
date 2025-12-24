import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import type { BrowserManager } from '../../browser'
import type { Page } from 'playwright'

export enum SearchSortType {
  TIME_DESC = '1',
  RELEVANCE = '0',
}

export enum SearchNoteType {
  FIXED_THREAD = '1',
  ALL = '0',
}

interface TiebaNote {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  publishTime: string
  replyCount: number
  url: string
}

interface TiebaComment {
  id: string
  content: string
  authorId: string
  authorName: string
  publishTime: string
  likeCount: number
}

@Injectable()
export class TiebaClient {
  private readonly baseURL = 'https://tieba.baidu.com'
  private httpClient: HttpClient
  private page?: Page

  constructor(private browserManager?: BrowserManager) {
    this.httpClient = new HttpClient({
      baseURL: this.baseURL,
      timeout: 60000,
      enableCookies: true,
      enableLogging: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    })
  }

  async initPage(): Promise<void> {
    if (!this.browserManager) return
    const { context } = await this.browserManager.launch({ headless: false })
    this.page = await context.newPage()
  }

  async pong(): Promise<boolean> {
    if (!this.page) return false
    try {
      const cookies = await this.page.context().cookies()
      return cookies.some(c => c.name === 'BDUSS' || c.name === 'STOKEN')
    } catch {
      return false
    }
  }

  async searchByKeyword(
    keyword: string,
    page = 1,
    pageSize = 10,
    sort = SearchSortType.TIME_DESC,
    noteType = SearchNoteType.FIXED_THREAD,
  ): Promise<TiebaNote[]> {
    if (!this.page) throw new Error('Page not initialized')

    const url = `${this.baseURL}/f/search/res?ie=utf-8&qw=${encodeURIComponent(keyword)}&rn=${pageSize}&pn=${page}&sm=${sort}&only_thread=${noteType}`
    await this.page.goto(url, { waitUntil: 'domcontentloaded' })
    await this.page.waitForTimeout(1000)

    return this.page.evaluate(() => {
      const results: TiebaNote[] = []
      const items = document.querySelectorAll('.s_post')

      items.forEach(item => {
        const titleEl = item.querySelector('.p_title a')
        const authorEl = item.querySelector('.p_author .p_author_name')
        const timeEl = item.querySelector('.p_date')
        const replyEl = item.querySelector('.p_reply .p_red')

        if (titleEl && authorEl) {
          const href = titleEl.getAttribute('href') || ''
          const id = href.match(/\/p\/(\d+)/)?.[1] || ''

          results.push({
            id,
            title: titleEl.textContent?.trim() || '',
            content: '',
            authorId: authorEl.getAttribute('data-field')?.match(/"id":"([^"]+)"/)?.[1] || '',
            authorName: authorEl.textContent?.trim() || '',
            publishTime: timeEl?.textContent?.trim() || '',
            replyCount: parseInt(replyEl?.textContent?.trim() || '0'),
            url: `https://tieba.baidu.com${href}`,
          })
        }
      })

      return results
    })
  }

  async getNoteDetail(noteId: string): Promise<TiebaNote | null> {
    if (!this.page) throw new Error('Page not initialized')

    const url = `${this.baseURL}/p/${noteId}`
    await this.page.goto(url, { waitUntil: 'domcontentloaded' })
    await this.page.waitForTimeout(1000)

    return this.page.evaluate(() => {
      const titleEl = document.querySelector('.core_title_txt')
      const authorEl = document.querySelector('.p_author .p_author_name')
      const contentEl = document.querySelector('.d_post_content')
      const timeEl = document.querySelector('.post-tail-wrap .tail-info:last-child')

      if (!titleEl || !authorEl) return null

      return {
        id: window.location.pathname.match(/\/p\/(\d+)/)?.[1] || '',
        title: titleEl.textContent?.trim() || '',
        content: contentEl?.textContent?.trim() || '',
        authorId: authorEl.getAttribute('data-field')?.match(/"id":"([^"]+)"/)?.[1] || '',
        authorName: authorEl.textContent?.trim() || '',
        publishTime: timeEl?.textContent?.trim() || '',
        replyCount: 0,
        url: window.location.href,
      }
    })
  }

  async getComments(noteId: string, page = 1): Promise<TiebaComment[]> {
    if (!this.page) throw new Error('Page not initialized')

    const url = `${this.baseURL}/p/${noteId}?pn=${page}`
    await this.page.goto(url, { waitUntil: 'domcontentloaded' })
    await this.page.waitForTimeout(1000)

    return this.page.evaluate(() => {
      const results: TiebaComment[] = []
      const items = document.querySelectorAll('.l_post')

      items.forEach(item => {
        const dataField = item.getAttribute('data-field')
        if (!dataField) return

        const data = JSON.parse(dataField)
        const contentEl = item.querySelector('.d_post_content')
        const authorEl = item.querySelector('.p_author_name')

        if (data.content && authorEl) {
          results.push({
            id: data.content.post_id || '',
            content: contentEl?.textContent?.trim() || '',
            authorId: data.author.user_id || '',
            authorName: authorEl.textContent?.trim() || '',
            publishTime: data.content.date || '',
            likeCount: 0,
          })
        }
      })

      return results
    })
  }

  async loadCookies(cookies: Record<string, string>): Promise<void> {
    await this.httpClient.loadCookies(JSON.stringify(cookies))

    if (this.page) {
      const cookieArray = Object.entries(cookies).map(([name, value]) => ({
        name,
        value,
        domain: '.baidu.com',
        path: '/',
      }))
      await this.page.context().addCookies(cookieArray)
    }
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close()
    }
  }
}
