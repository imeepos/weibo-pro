import React, { useState } from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { SqlExecuteAst, type SqlParameter } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Button } from '@sker/ui/components/ui/button';
import { Trash2, Plus, Database } from 'lucide-react';
import { cn } from '@sker/ui/lib/utils';
import { SimplePagination } from '@sker/ui/components/ui/simple-pagination';

const SqlPreview = ({ ast }: { ast: SqlExecuteAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <Database className="size-5 text-blue-400" />
    <div className="text-xs text-slate-300 mt-1 truncate max-w-full px-2">
      {ast.sql || '未配置 SQL'}
    </div>
  </div>
);

interface SqlSettingProps {
  ast: SqlExecuteAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const SqlSetting: React.FC<SqlSettingProps> = ({ ast, onPropertyChange }) => {
  const [parameters, setParameters] = useState<SqlParameter[]>(ast.parameters || []);

  const handleSqlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPropertyChange?.('sql', e.target.value);
  };

  const addParameter = () => {
    const newParams = [...parameters, { key: '', value: '' }];
    setParameters(newParams);
    onPropertyChange?.('parameters', newParams);
  };

  const removeParameter = (index: number) => {
    const newParams = parameters.filter((_, i) => i !== index);
    setParameters(newParams);
    onPropertyChange?.('parameters', newParams);
  };

  const updateParameter = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...parameters];
    const param = newParams[index];
    if (param) {
      param[field] = value;
      setParameters(newParams);
      onPropertyChange?.('parameters', newParams);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">SQL 语句</Label>
        <textarea
          className={cn(
            "w-full min-h-[150px] p-2 rounded-md border text-sm font-mono",
            "bg-background text-foreground"
          )}
          placeholder="SELECT * FROM users WHERE id = $1"
          value={ast.sql || ''}
          onChange={handleSqlChange}
        />
        <div className="text-xs text-muted-foreground">
          支持参数化查询，使用 $1, $2, $3... 作为占位符
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">参数</Label>
          <Button type="button" size="sm" variant="outline" onClick={addParameter}>
            <Plus className="size-4 mr-1" />
            添加参数
          </Button>
        </div>
        {parameters.map((param, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="参数名 (如: userId)"
              value={param.key}
              onChange={(e) => updateParameter(index, 'key', e.target.value)}
              className="bg-background text-foreground"
            />
            <Input
              placeholder="参数值"
              value={param.value}
              onChange={(e) => updateParameter(index, 'value', e.target.value)}
              className="bg-background text-foreground"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeParameter(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SqlRender: React.FC<{ ast: SqlExecuteAst }> = ({ ast }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  if (ast.state === 'pending') return null;

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResults = ast.results.slice(startIndex, endIndex);
  const totalPages = Math.ceil(ast.results.length / pageSize);

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">影响行数</div>
        <div className="text-sm font-mono px-2 py-1 rounded bg-blue-900/30 text-blue-400 inline-block">
          {ast.affectedRows} 行
        </div>
      </div>

      {ast.results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">查询结果</div>
          <div className="max-h-[400px] overflow-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-accent/50 sticky top-0">
                <tr>
                  {ast.columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {col.name}
                      <span className="ml-1 text-[10px] text-muted-foreground/60">
                        ({col.type})
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {paginatedResults.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-accent/20 transition-colors">
                    {ast.columns.map((col) => (
                      <td
                        key={col.name}
                        className="px-3 py-2 text-xs font-mono text-foreground whitespace-nowrap"
                      >
                        {row[col.name] !== null && row[col.name] !== undefined
                          ? String(row[col.name])
                          : <span className="text-muted-foreground italic">null</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <SimplePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {ast.results.length === 0 && ast.affectedRows === 0 && (
        <div className="text-xs text-muted-foreground italic">
          无结果返回
        </div>
      )}
    </div>
  );
};

@Injectable()
export class SqlExecuteAstRender {
  @Render(SqlExecuteAst)
  render(ast: SqlExecuteAst) {
    return <SqlRender ast={ast} />;
  }

  @Setting(SqlExecuteAst)
  setting(ast: SqlExecuteAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <SqlSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(SqlExecuteAst)
  preview(ast: SqlExecuteAst) {
    return <SqlPreview ast={ast} />;
  }
}
