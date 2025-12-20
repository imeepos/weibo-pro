import React, { useState } from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { HttpAst, type HttpMethod, type HttpHeader } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Button } from '@sker/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

const HttpPreview = ({ ast }: { ast: HttpAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <div className="text-lg">🌐</div>
    <div className="text-xs text-slate-300 mt-1">{ast.method} {ast.url || '未配置'}</div>
  </div>
);

interface HttpSettingProps {
  ast: HttpAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const HttpSetting: React.FC<HttpSettingProps> = ({ ast, onPropertyChange }) => {
  const [headers, setHeaders] = useState<HttpHeader[]>(ast.headers || []);
  const [queryParams, setQueryParams] = useState<HttpHeader[]>(ast.queryParams || []);

  const handleMethodChange = (method: HttpMethod) => {
    onPropertyChange?.('method', method);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPropertyChange?.('url', e.target.value);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPropertyChange?.('body', e.target.value);
  };

  const handleTimeoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 30000;
    onPropertyChange?.('timeout', value);
  };

  const addHeader = () => {
    const newHeaders = [...headers, { key: '', value: '' }];
    setHeaders(newHeaders);
    onPropertyChange?.('headers', newHeaders);
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
    onPropertyChange?.('headers', newHeaders);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    const header = newHeaders[index];
    if (header) {
      header[field] = value;
      setHeaders(newHeaders);
      onPropertyChange?.('headers', newHeaders);
    }
  };

  const addQueryParam = () => {
    const newParams = [...queryParams, { key: '', value: '' }];
    setQueryParams(newParams);
    onPropertyChange?.('queryParams', newParams);
  };

  const removeQueryParam = (index: number) => {
    const newParams = queryParams.filter((_, i) => i !== index);
    setQueryParams(newParams);
    onPropertyChange?.('queryParams', newParams);
  };

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...queryParams];
    const param = newParams[index];
    if (param) {
      param[field] = value;
      setQueryParams(newParams);
      onPropertyChange?.('queryParams', newParams);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">请求方法</Label>
        <Select value={ast.method} onValueChange={handleMethodChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="HEAD">HEAD</SelectItem>
            <SelectItem value="OPTIONS">OPTIONS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">请求 URL</Label>
        <Input
          type="text"
          placeholder="https://api.example.com/endpoint"
          value={ast.url}
          onChange={handleUrlChange}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">查询参数</Label>
          <Button type="button" size="sm" variant="outline" onClick={addQueryParam}>
            <Plus className="size-4 mr-1" />
            添加
          </Button>
        </div>
        {queryParams.map((param, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="key"
              value={param.key}
              onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
            />
            <Input
              placeholder="value"
              value={param.value}
              onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeQueryParam(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">请求头</Label>
          <Button type="button" size="sm" variant="outline" onClick={addHeader}>
            <Plus className="size-4 mr-1" />
            添加
          </Button>
        </div>
        {headers.map((header, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Header-Name"
              value={header.key}
              onChange={(e) => updateHeader(index, 'key', e.target.value)}
            />
            <Input
              placeholder="Header-Value"
              value={header.value}
              onChange={(e) => updateHeader(index, 'value', e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeHeader(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {['POST', 'PUT', 'PATCH', 'DELETE'].includes(ast.method) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">请求体</Label>
          <textarea
            className="w-full min-h-[100px] p-2 rounded-md border bg-background text-sm font-mono"
            placeholder='{"key": "value"}'
            value={ast.body || ''}
            onChange={handleBodyChange}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">超时时间 (ms)</Label>
        <Input
          type="number"
          min="1000"
          step="1000"
          value={ast.timeout}
          onChange={handleTimeoutChange}
        />
      </div>
    </div>
  );
};

const HttpRender: React.FC<{ ast: HttpAst }> = ({ ast }) => {
  if (ast.state === 'pending') return null;

  return (
    <div className="p-4 space-y-3">
      {ast.status > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">状态码</div>
          <div className={`text-sm font-mono px-2 py-1 rounded ${
            ast.status >= 200 && ast.status < 300
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}>
            {ast.status}
          </div>
        </div>
      )}

      {ast.response && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">响应体</div>
          <div className="max-h-[300px] overflow-auto p-2 rounded-lg bg-accent/50 border border-border">
            <pre className="text-xs text-foreground whitespace-pre-wrap break-all">
              {typeof ast.response === 'object'
                ? JSON.stringify(ast.response, null, 2)
                : String(ast.response)}
            </pre>
          </div>
        </div>
      )}

      {ast.responseHeaders && Object.keys(ast.responseHeaders).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">响应头</div>
          <div className="max-h-[150px] overflow-auto p-2 rounded-lg bg-accent/50 border border-border">
            {Object.entries(ast.responseHeaders).map(([key, value]) => (
              <div key={key} className="text-xs font-mono">
                <span className="text-blue-400">{key}</span>: {value}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class HttpAstRender {
  @Render(HttpAst)
  render(ast: HttpAst) {
    return <HttpRender ast={ast} />;
  }

  @Setting(HttpAst)
  setting(ast: HttpAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <HttpSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(HttpAst)
  preview(ast: HttpAst) {
    return <HttpPreview ast={ast} />;
  }
}
