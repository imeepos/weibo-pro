import { Controller, Query } from '@sker/core';
import { root } from '@sker/core';
import { UserStratificationService } from '../services/data/user-stratification.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.UserStratificationController)
export class UserStratificationController implements sdk.UserStratificationController {
  private userStratificationService: UserStratificationService;

  constructor() {
    this.userStratificationService = root.get(UserStratificationService);
  }

  async getStratification(@Query('eventId') eventId: string) {
    return this.userStratificationService.getUserStratification(eventId);
  }
}
