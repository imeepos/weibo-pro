import { Controller, Inject } from '@sker/core';
import { NetworkCentralityService } from '../services/data/network-centrality.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.NetworkCentralityController)
export class NetworkCentralityController implements sdk.NetworkCentralityController {
  constructor(@Inject(NetworkCentralityService) private networkCentralityService: NetworkCentralityService) {}

  async getAnalysis(eventId: string) {
    return this.networkCentralityService.getCentralityAnalysis(eventId);
  }
}
