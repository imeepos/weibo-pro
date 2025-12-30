import { Controller, Get, Query } from '@sker/core';

@Controller()
export class ProxyController {
  @Get('/proxy/qrcode')
  async proxyQRCode(@Query('url') url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
