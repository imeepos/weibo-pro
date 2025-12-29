import { Ast, Input, Node, Output } from '@sker/workflow';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

@Node({
  title: 'HTTP 请求',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class HttpRequestAst extends Ast {
  @Input({
    title: '请求方法',
    defaultValue: 'GET',
    type: 'select',
    options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  })
  method: HttpMethod = 'GET';

  @Input({ title: 'URL', defaultValue: '' })
  url = '';

  @Input({ title: '请求头', type: 'object', defaultValue: {} })
  headers: Record<string, string> = {};

  @Input({ title: '请求体', type: 'object', defaultValue: null })
  body: any = null;

  @Output({ title: '响应', defaultValue: null })
  response: any = null;

  @Output({ title: '状态码', defaultValue: 0 })
  status = 0;

  @Output({ title: 'Content-Type', defaultValue: '' })
  contentType = '';

  type: 'HttpRequestAst' = 'HttpRequestAst';
}
