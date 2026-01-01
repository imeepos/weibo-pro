import { Controller, Post, Param, Body } from '@sker/core';
import { Observable } from 'rxjs';

@Controller('llm')
export class LlmProxyController {
  @Post(':protocol/**')
  proxyMessages(
    @Param('protocol') protocol: string,
    @Body() body: any
  ): Promise<any> | Observable<any> {
    throw new Error('method proxyMessages not implements');
  }
}
