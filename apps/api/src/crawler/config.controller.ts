import { Controller, Get, Put, Param, Body } from '@sker/core'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { ConfigService } from './config.service'

@Controller(sdk.ConfigController)
export class ConfigController {
  private service: ConfigService

  constructor() {
    this.service = root.get(ConfigService)
  }

  @Get(':platform')
  async getConfig(@Param('platform') platform: sdk.MediaPlatform) {
    return this.service.getPlatformConfig(platform)
  }

  @Put(':platform')
  async updateConfig(@Param('platform') platform: sdk.MediaPlatform, @Body() config: any) {
    return this.service.updatePlatformConfig(platform, config)
  }
}
