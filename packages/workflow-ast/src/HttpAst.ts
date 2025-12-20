import { Ast, Input, Node, Output, State } from '@sker/workflow';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpHeader {
  key: string;
  value: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
}

@Node({
  title: 'HTTP 请求',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class HttpAst extends Ast {
  @State({ title: '请求方法' })
  method: HttpMethod = 'GET';

  @State({ title: '请求 URL' })
  url = '';

  @State({ title: '请求头' })
  headers: HttpHeader[] = [];

  @State({ title: '请求体' })
  body?: string;

  @State({ title: '查询参数' })
  queryParams: HttpHeader[] = [];

  @State({ title: '超时时间(ms)' })
  timeout = 30000;

  @Input({ title: '触发', defaultValue: true })
  trigger: boolean = true;

  @Output({ title: '响应体', defaultValue: null })
  response: any = null;

  @Output({ title: '状态码', defaultValue: 0 })
  status = 0;

  @Output({ title: '响应头', defaultValue: {} })
  responseHeaders: Record<string, string> = {};

  type: 'HttpAst' = 'HttpAst';
}
