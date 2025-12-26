import { Controller, Get, Put, Param, Body } from '@sker/core'
import type { MediaPlatform } from '../types'

/**
 * 平台配置控制器 SDK
 * 用于管理各平台的爬虫配置
 */
@Controller('config')
export class ConfigController {
  /**
   * 获取指定平台的配置
   * @param platform 平台标识
   */
  @Get(':platform')
  getConfig(@Param('platform') platform: MediaPlatform): Promise<any> {
    throw new Error('method getConfig not implements')
  }

  /**
   * 更新指定平台的配置
   * @param platform 平台标识
   * @param config 配置数据
   */
  @Put(':platform')
  updateConfig(@Param('platform') platform: MediaPlatform, @Body() config: any): Promise<any> {
    throw new Error('method updateConfig not implements')
  }
}
