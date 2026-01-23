import { Controller, Inject } from '@sker/core';
import * as sdk from '@sker/sdk';
import { InfluencePredictionService } from '../services/data/influence-prediction.service';

@Controller(sdk.InfluencePredictionController)
export class InfluencePredictionController implements sdk.InfluencePredictionController {
  constructor(@Inject(InfluencePredictionService) private influencePredictionService: InfluencePredictionService) {}

  async getInfluencePrediction(eventId: string) {
    return this.influencePredictionService.getInfluencePredictionAnalysis(eventId);
  }
}
