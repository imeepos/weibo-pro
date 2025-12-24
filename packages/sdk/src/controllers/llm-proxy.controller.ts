import { Controller, Post, Param, Body, Headers } from '@sker/core';

@Controller('llm')
export class LlmProxyController {
  @Post(':protocol/*')
  proxyMessages(
    @Param('protocol') protocol: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>
  ): Promise<any> {
    throw new Error('method proxyMessages not implements');
  }
}
