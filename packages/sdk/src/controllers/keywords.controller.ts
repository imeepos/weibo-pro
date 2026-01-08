import { Controller, Get, Query } from '@sker/core'
import type { KeywordWordCloudItem } from '../types'

@Controller('keywords')
export class KeywordsController {

  @Get('wordcloud')
  getWordCloud(
    @Query('maxWords') maxWords?: number,
    @Query('sentiment') sentiment?: 'positive' | 'negative' | 'neutral'
  ): Promise<KeywordWordCloudItem[]> {
    throw new Error('method getWordCloud not implements')
  }
}