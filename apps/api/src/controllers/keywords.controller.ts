import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { KeywordsService } from '../services/data/keywords.service';
import { KeywordData } from '../services/data/types';

@Controller('api/keywords')
export class KeywordsController {
  private keywordsService: KeywordsService;

  constructor() {
    this.keywordsService = root.get(KeywordsService);
  }

  @Get('wordcloud')
  async getWordCloud(@Query('maxWords') maxWords?: number): Promise<{
    success: boolean;
    data: KeywordData[];
    timestamp: string;
  }> {
    try {
      const data = await this.keywordsService.getWordCloud(maxWords || 100);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}