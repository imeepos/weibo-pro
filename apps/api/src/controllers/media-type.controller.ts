import { Controller, Inject } from '@sker/core';
import { MediaTypeService } from '../services/data/media-type.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.MediaTypeController)
export class MediaTypeController implements sdk.MediaTypeController {
  constructor(@Inject(MediaTypeService) private mediaTypeService: MediaTypeService) {}

  async getDistribution(eventId: string) {
    return this.mediaTypeService.getMediaTypeDistribution(eventId);
  }
}
