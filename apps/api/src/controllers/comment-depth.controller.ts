import { Controller, Query } from '@sker/core';
import { root } from '@sker/core';
import { CommentDepthService } from '../services/data/comment-depth.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.CommentDepthController)
export class CommentDepthController implements sdk.CommentDepthController {
  private commentDepthService: CommentDepthService;

  constructor() {
    this.commentDepthService = root.get(CommentDepthService);
  }

  async getAnalysis(@Query('eventId') eventId: string) {
    return this.commentDepthService.getCommentDepth(eventId);
  }
}
