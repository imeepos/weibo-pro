import { Injectable } from '@sker/core'
import { HttpClient } from '../../http'
import { KUAISHOU_GRAPHQL } from './graphql'

interface GraphQLResponse<T = any> {
  data?: T
  errors?: any[]
}

@Injectable()
export class KuaishouClient {
  private readonly baseURL = 'https://www.kuaishou.com/graphql'
  private httpClient: HttpClient

  constructor() {
    this.httpClient = new HttpClient({
      baseURL: this.baseURL,
      timeout: 60000,
      enableCookies: true,
      enableLogging: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
  }

  private async request<T>(query: string, variables: Record<string, any>): Promise<T> {
    const response = await this.httpClient.post<GraphQLResponse<T>>('', {
      operationName: this.extractOperationName(query),
      variables,
      query,
    })

    if (response.data.errors) {
      throw new Error(JSON.stringify(response.data.errors))
    }

    return response.data.data as T
  }

  private extractOperationName(query: string): string {
    const match = query.match(/query\s+(\w+)/)
    return match?.[1] || ''
  }

  async pong(): Promise<boolean> {
    try {
      await this.request(KUAISHOU_GRAPHQL.vision_profile, { userId: '' })
      return true
    } catch {
      return false
    }
  }

  async searchByKeyword(keyword: string, pcursor = '', searchSessionId = '') {
    return this.request(KUAISHOU_GRAPHQL.search_query, {
      keyword,
      pcursor,
      searchSessionId,
      page: 'search',
    })
  }

  async getVideoDetail(photoId: string) {
    return this.request(KUAISHOU_GRAPHQL.video_detail, {
      photoId,
      page: 'search',
    })
  }

  async getComments(photoId: string, pcursor = '') {
    return this.request(KUAISHOU_GRAPHQL.comment_list, {
      photoId,
      pcursor,
    })
  }

  async getCreatorInfo(userId: string) {
    return this.request(KUAISHOU_GRAPHQL.vision_profile, { userId })
  }

  async loadCookies(cookies: Record<string, string>) {
    await this.httpClient.loadCookies(JSON.stringify(cookies))
  }

  async saveCookies(): Promise<string | undefined> {
    return this.httpClient.saveCookies()
  }
}
