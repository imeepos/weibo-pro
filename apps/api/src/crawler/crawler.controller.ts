import { Controller, Post, Get, Body, Param } from '@sker/core'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { CrawlerService } from './crawler.service'

@Controller('crawler')
export class CrawlerController {
  private service: CrawlerService

  constructor() {
    this.service = root.get(CrawlerService)
  }

  @Post('start')
  async start(@Body() request: sdk.CrawlerStartRequest) {
    return this.service.start(request)
  }

  @Get('status/:id')
  async getStatus(@Param('id') id: string) {
    return this.service.getStatus(id)
  }

  @Post('stop/:id')
  async stop(@Param('id') id: string) {
    return this.service.stop(id)
  }

  @Get('list')
  async list() {
    return this.service.list()
  }
}
