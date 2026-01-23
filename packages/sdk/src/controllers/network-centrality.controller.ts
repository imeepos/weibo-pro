import { Controller, Get, Query } from '@sker/core'
import type { CentralityAnalysis } from '../types'

@Controller('network-centrality')
export class NetworkCentralityController {
  @Get('analysis')
  getAnalysis(@Query('eventId') eventId: string): Promise<CentralityAnalysis> {
    throw new Error('method getAnalysis not implements')
  }
}
