import { Controller, Post, Get, Body, Param } from '@sker/core'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { LoginService } from './login.service'

@Controller(sdk.LoginController)
export class LoginController {
  private service: LoginService

  constructor() {
    this.service = root.get(LoginService)
  }

  @Post(':platform/qrcode')
  async getQRCode(@Param('platform') platform: sdk.MediaPlatform) {
    return this.service.getQRCode(platform)
  }

  @Get(':platform/status')
  async getStatus(@Param('platform') platform: sdk.MediaPlatform) {
    return this.service.getStatus(platform)
  }

  @Post(':platform/cookie')
  async loginWithCookie(@Param('platform') platform: sdk.MediaPlatform, @Body() request: sdk.CookieLoginRequest) {
    return this.service.loginWithCookie({ ...request, platform })
  }
}
