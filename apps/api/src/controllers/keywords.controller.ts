import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { KeywordsService } from '../services/data/keywords.service';
import * as sdk from '@sker/sdk';

@Controller('api/keywords')
export class KeywordsController implements sdk.KeywordsController{
  private keywordsService: KeywordsService;

  constructor() {
    this.keywordsService = root.get(KeywordsService);
  }

  @Get('wordcloud')
  async getWordCloud(@Query('maxWords') maxWords?: number) {
    return this.keywordsService.getWordCloud(maxWords || 100);
  }
}