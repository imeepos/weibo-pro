import { Controller, Post, Param, Body, Headers, Sse } from '@sker/core';
import { Observable } from 'rxjs';

@Controller('llm')
export class LlmProxyController {
  @Post(':protocol/*')
  proxyMessages(
    @Param('protocol') protocol: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>
  ): Promise<any> | Observable<any> {
    throw new Error('method proxyMessages not implements');
  }
}
