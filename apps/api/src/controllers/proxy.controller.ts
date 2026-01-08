import { Controller } from '@sker/core';
import * as sdk from '@sker/sdk';

@Controller(sdk.ProxyController)
export class ProxyController {
  async proxyQRCode(url: string) {
    return fetch(url)
  }
}
