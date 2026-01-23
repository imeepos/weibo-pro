import { Controller, Get, Query } from '@sker/core';
import { root } from '@sker/core';
import { PostingTimeService } from '../services/data/posting-time.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.PostingTimeController)
export class PostingTimeController implements sdk.PostingTimeController {
  private postingTimeService: PostingTimeService;

  constructor() {
    this.postingTimeService = root.get(PostingTimeService);
  }

  @Get('heatmap')
  async getHeatmap(@Query('eventId') eventId: string): Promise<sdk.PostingTimeHeatmap> {
    return this.postingTimeService.getPostingTimeHeatmap(eventId);
  }
}
