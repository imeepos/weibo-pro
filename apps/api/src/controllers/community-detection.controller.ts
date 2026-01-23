import { Controller, Inject } from '@sker/core';
import { CommunityDetectionService } from '../services/data/community-detection.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.CommunityDetectionController)
export class CommunityDetectionController implements sdk.CommunityDetectionController {
  constructor(@Inject(CommunityDetectionService) private communityDetectionService: CommunityDetectionService) {}

  async getAnalysis(eventId: string) {
    return this.communityDetectionService.getCommunityAnalysis(eventId);
  }
}
