import { Controller, } from '@sker/core';
import { root } from '@sker/core';
import { KeywordsService } from '../services/data/keywords.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.KeywordsController)
export class KeywordsController implements sdk.KeywordsController{
  private keywordsService: KeywordsService;

  constructor() {
    this.keywordsService = root.get(KeywordsService);
  }

  async getWordCloud(maxWords?: number, sentiment?: 'positive' | 'negative' | 'neutral') {
    return this.keywordsService.getWordCloud(maxWords || 100, sentiment);
  }
}