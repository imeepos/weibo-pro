import { Controller, Get, Query } from '@sker/core'
import type { PostingTimeHeatmap } from '../types'

@Controller('posting-time')
export class PostingTimeController {
  @Get('heatmap')
  getHeatmap(@Query('eventId') eventId: string): Promise<PostingTimeHeatmap> {
    throw new Error('method getHeatmap not implements')
  }
}
