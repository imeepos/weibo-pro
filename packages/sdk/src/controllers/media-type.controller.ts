import { Controller, Get, Query } from '@sker/core'
import type { MediaTypeAnalysis } from '../types'

@Controller('media-type')
export class MediaTypeController {
  @Get('distribution')
  getDistribution(@Query('eventId') eventId: string): Promise<MediaTypeAnalysis> {
    throw new Error('method getDistribution not implements')
  }
}
