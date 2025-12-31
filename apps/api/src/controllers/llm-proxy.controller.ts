import { Controller, Post, Param, Req, Res, Headers, Body, Inject, REQUEST, RESPOSNE } from '@sker/core';
import type { IncomingMessage, ServerResponse } from 'http';
import { LlmProxyService } from '../services/llm-proxy.service';
import { Readable } from 'stream';
import * as sdk from '@sker/sdk';

@Controller(sdk.LlmProxyController)
export class LlmProxyController {
  constructor(
    @Inject(LlmProxyService) private readonly llmProxyService: LlmProxyService,
    @Inject(REQUEST) private req: IncomingMessage,
    @Inject(RESPOSNE) private res: ServerResponse
  ) { }

  @Post(':protocol/*')
  async proxyMessages(
    @Param('protocol') protocol: string,
    @Body() body: any
  ) {
    const headers = Object.fromEntries(this.req.headers as any);
    const contentLength = parseInt(headers['content-length'] || '0');
    const url = new URL(this.req.url || '', `http://${this.req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const apiPath = '/' + pathParts.slice(2).join('/'); // 跳过 'llm' 和 protocol

    const result = await this.llmProxyService.proxyRequest(protocol, apiPath, body, headers, contentLength);

    if (!result.success) {
      this.res.statusCode = 503;
      this.res.setHeader('Content-Type', 'application/json');
      this.res.end(JSON.stringify({ error: result.error }));
      return;
    }

    if (!result.response) {
      this.res.statusCode = 500;
      this.res.setHeader('Content-Type', 'application/json');
      this.res.end(JSON.stringify({ error: '无响应' }));
      return;
    }

    const response = result.response;
    this.res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        this.res.setHeader(key, value);
      }
    });

    if (!response.body) {
      const text = await response.text();
      this.res.end(text);
      return;
    }

    const reader = response.body.getReader();
    const nodeStream = new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      }
    });

    nodeStream.pipe(this.res);
  }
}
