import { Controller, Get, Query } from '@sker/core'
import type { CommunityAnalysis } from '../types'

@Controller('community-detection')
export class CommunityDetectionController {
  @Get('analysis')
  getAnalysis(@Query('eventId') eventId: string): Promise<CommunityAnalysis> {
    throw new Error('method getAnalysis not implements')
  }
}
