import { Controller, Get, Query } from '@sker/core'
import type { SpreadBreadthAnalysis } from '../types'

@Controller('spread-breadth')
export class SpreadBreadthController {
  @Get('analysis')
  getAnalysis(@Query('eventId') eventId: string): Promise<SpreadBreadthAnalysis> {
    throw new Error('method getAnalysis not implements')
  }
}
