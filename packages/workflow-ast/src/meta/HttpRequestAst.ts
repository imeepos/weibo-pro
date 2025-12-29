import { Ast, Input, Node, Output, State } from '@sker/workflow';

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
  @State({ title: '请求方法' })
  method: HttpMethod = 'GET';

  @State({ title: 'URL' })
  url = '';

  @State({ title: '请求头' })
  headers: Record<string, string> = {};

  @Input({ title: '请求体', defaultValue: null })
  body: any = null;

  @Output({ title: '响应', defaultValue: null })
  response: any = null;

  @Output({ title: '状态码', defaultValue: 0 })
  status = 0;

  type: 'HttpRequestAst' = 'HttpRequestAst';
}
