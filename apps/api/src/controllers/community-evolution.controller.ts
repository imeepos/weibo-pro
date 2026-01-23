import { Controller, Inject } from '@sker/core';
import { CommunityEvolutionService } from '../services/data/community-evolution.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.CommunityEvolutionController)
export class CommunityEvolutionController implements sdk.CommunityEvolutionController {
  constructor(@Inject(CommunityEvolutionService) private communityEvolutionService: CommunityEvolutionService) {}

  async getAnalysis(eventId: string) {
    return await this.communityEvolutionService.getCommunityEvolutionAnalysis(eventId);
  }
}
