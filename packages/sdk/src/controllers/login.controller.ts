import { Controller, Post, Get, Body, Param } from '@sker/core'
import type { MediaPlatform, QRCodeData, LoginStatusResponse, CookieLoginRequest } from '../types'

/**
 * 登录控制器 SDK
 * 用于管理各平台的登录流程（二维码登录、Cookie 登录）
 */
@Controller('login')
export class LoginController {
  /**
   * 获取指定平台的二维码登录信息
   * @param platform 平台标识
   */
  @Post(':platform/qrcode')
  getQRCode(@Param('platform') platform: MediaPlatform): Promise<QRCodeData> {
    throw new Error('method getQRCode not implements')
  }

  /**
   * 获取指定平台的登录状态
   * @param platform 平台标识
   */
  @Get(':platform/status')
  getStatus(@Param('platform') platform: MediaPlatform): Promise<LoginStatusResponse> {
    throw new Error('method getStatus not implements')
  }

  /**
   * 使用 Cookie 登录指定平台
   * @param platform 平台标识
   * @param request Cookie 登录请求数据
   */
  @Post(':platform/cookie')
  loginWithCookie(
    @Param('platform') platform: MediaPlatform,
    @Body() request: CookieLoginRequest
  ): Promise<{ status: string; message: string }> {
    throw new Error('method loginWithCookie not implements')
  }
}
