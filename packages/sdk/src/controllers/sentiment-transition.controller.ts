import { Controller, Get, Query } from '@sker/core'
import type { SentimentTransitionAnalysis } from '../types'

@Controller('sentiment-transition')
export class SentimentTransitionController {
  @Get('analysis')
  getAnalysis(@Query('eventId') eventId: string): Promise<SentimentTransitionAnalysis> {
    throw new Error('method getAnalysis not implements')
  }
}
