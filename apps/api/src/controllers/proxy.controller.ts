import { Controller, Get, Query } from '@sker/core';
import * as sdk from '@sker/sdk';

@Controller(sdk.ProxyController)
export class ProxyController {
  async proxyQRCode(url: string) {
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
