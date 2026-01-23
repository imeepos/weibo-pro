import { Controller, Inject } from '@sker/core';
import { SpreadBreadthService } from '../services/data/spread-breadth.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.SpreadBreadthController)
export class SpreadBreadthController implements sdk.SpreadBreadthController {
  constructor(@Inject(SpreadBreadthService) private spreadBreadthService: SpreadBreadthService) {}

  async getAnalysis(eventId: string) {
    return this.spreadBreadthService.getBreadthAnalysis(eventId);
  }
}
