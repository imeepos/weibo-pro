import { Controller, Post, Param, Req, Res, Headers } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LlmProxyService } from '../services/llm-proxy.service';
import { Readable } from 'stream';

@Controller('llm')
export class LlmProxyController {
  constructor(private readonly llmProxyService: LlmProxyService) { }

  @Post(':protocol/*')
  async proxyMessages(
    @Param('protocol') protocol: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: Record<string, string>
  ) {
    const body = req.body
    const contentLength = parseInt(headers['content-length'] || '0')
    const apiPath = '/' + req.path.split('/').slice(3).join('/')

    const result = await this.llmProxyService.proxyRequest(protocol, apiPath, body, headers, contentLength)

    if (!result.success) {
      return res.status(503).json({ error: result.error })
    }

    if (!result.response) {
      return res.status(500).json({ error: '无响应' })
    }

    const response = result.response
    res.status(response.status)

    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    if (!response.body) {
      const text = await response.text()
      return res.send(text)
    }

    const reader = response.body.getReader()
    const nodeStream = new Readable({
      async read() {
        const { done, value } = await reader.read()
        if (done) {
          this.push(null)
        } else {
          this.push(Buffer.from(value))
        }
      }
    })

    nodeStream.pipe(res)
  }
}
