import { Controller, Get, Query } from '@sker/core'
import type { InfluencePredictionAnalysis } from '../types'

@Controller('influence-prediction')
export class InfluencePredictionController {

  @Get('analysis')
  getInfluencePrediction(
    @Query('eventId') eventId: string
  ): Promise<InfluencePredictionAnalysis> {
    throw new Error('method getInfluencePrediction not implements')
  }
}
