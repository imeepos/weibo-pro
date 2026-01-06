import { Controller } from '@sker/core';
import * as sdk from '@sker/sdk';

@Controller(sdk.ProxyController)
export class ProxyController {
  async proxyQRCode(url: string) {
    console.log('[ProxyController] proxyQRCode called with url:', url);
    return fetch(url)
  }
}
