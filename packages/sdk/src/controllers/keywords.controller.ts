import { Controller, Get, Query } from '@sker/core'

@Controller('api/keywords')
export class KeywordsController {

  @Get('wordcloud')
  getWordCloud(@Query('maxWords') maxWords?: number): Promise<any> {
    throw new Error('method getWordCloud not implements')
  }
}