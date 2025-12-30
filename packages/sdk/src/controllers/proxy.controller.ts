import { Controller, Get, Query } from '@sker/core'

@Controller('proxy')
export class ProxyController {
  @Get('qrcode')
  proxyQRCode(@Query('url') url: string): Promise<Response> {
    return this.proxyQRCode(url)
  }
}
