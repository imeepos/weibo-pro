import { Controller, Get, Query } from '@sker/core'
import type { CommentDepthAnalysis } from '../types'

@Controller('comment-depth')
export class CommentDepthController {
  @Get('analysis')
  getAnalysis(@Query('eventId') eventId: string): Promise<CommentDepthAnalysis> {
    throw new Error('method getAnalysis not implements')
  }
}
