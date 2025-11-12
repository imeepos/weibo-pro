import { Controller, Get, Query } from '@sker/core'
import type { KeywordWordCloudItem } from '../types'

@Controller('api/keywords')
export class KeywordsController {

  @Get('wordcloud')
  getWordCloud(@Query('maxWords') maxWords?: number): Promise<KeywordWordCloudItem[]> {
    throw new Error('method getWordCloud not implements')
  }
}