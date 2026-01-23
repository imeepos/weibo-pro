import { Controller, Inject } from '@sker/core';
import * as sdk from '@sker/sdk';
import { SentimentTransitionService } from '../services/data/sentiment-transition.service';

@Controller(sdk.SentimentTransitionController)
export class SentimentTransitionController implements sdk.SentimentTransitionController {
  constructor(@Inject(SentimentTransitionService) private sentimentTransitionService: SentimentTransitionService) {}

  async getAnalysis(eventId: string) {
    return this.sentimentTransitionService.getSentimentTransitionAnalysis(eventId);
  }
}
