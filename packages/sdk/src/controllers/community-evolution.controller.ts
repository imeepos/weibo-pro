import { Controller, Get, Query } from '@sker/core'
import type { CommunityEvolutionAnalysis } from '../types'

@Controller('community-evolution')
export class CommunityEvolutionController {
  @Get('analysis')
  getAnalysis(@Query('eventId') eventId: string): Promise<CommunityEvolutionAnalysis> {
    throw new Error('method getAnalysis not implements')
  }
}
