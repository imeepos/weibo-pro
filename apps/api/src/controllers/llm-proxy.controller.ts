import { Controller, Post, Param, Req, Res, Headers, Body } from '@sker/core';
import type { IncomingMessage, ServerResponse } from 'http';
import { LlmProxyService } from '../services/llm-proxy.service';
import { Readable } from 'stream';

@Controller('llm')
export class LlmProxyController {
  constructor(private readonly llmProxyService: LlmProxyService) { }

  @Post(':protocol/*')
  async proxyMessages(
    @Param('protocol') protocol: string,
    @Body() body: any,
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
    @Headers() headers: Record<string, string>
  ) {
    const contentLength = parseInt(headers['content-length'] || '0');
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const apiPath = '/' + pathParts.slice(2).join('/'); // 跳过 'llm' 和 protocol

    const result = await this.llmProxyService.proxyRequest(protocol, apiPath, body, headers, contentLength);

    if (!result.success) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    if (!result.response) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: '无响应' }));
      return;
    }

    const response = result.response;
    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (!response.body) {
      const text = await response.text();
      res.end(text);
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

    nodeStream.pipe(res);
  }
}
