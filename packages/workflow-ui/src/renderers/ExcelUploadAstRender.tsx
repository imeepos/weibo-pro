import React, { useState, useRef, useCallback } from 'react';
import { Injectable, root } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { ExcelUploadAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Button } from '@sker/ui/components/ui/button';
import { UploadController } from '@sker/sdk';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { cn } from '@sker/ui/lib/utils';
import { SimplePagination } from '@sker/ui/components/ui/simple-pagination';
import { Switch } from '@sker/ui/components/ui/switch';
import { useReactFlow } from '@xyflow/react';

const ExcelPreview = ({ ast }: { ast: ExcelUploadAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <FileSpreadsheet className="size-5 text-green-400" />
    <div className="text-xs text-slate-300 mt-1 truncate max-w-full px-2">
      {ast.fileUrl ? `${ast.rowCount} 行数据` : '未上传文件'}
    </div>
  </div>
);

interface ExcelSettingProps {
  ast: ExcelUploadAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const ExcelSetting: React.FC<ExcelSettingProps> = ({ ast, onPropertyChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      alert('请选择 Excel 文件（.xlsx 或 .xls）');
      return;
    }

    setIsUploading(true);

    try {
      const controller = root.get(UploadController);
      const formData = new FormData();
      formData.append('file', file);

      const result = await controller.uploadFile(formData);
      onPropertyChange?.('fileUrl', result.url);
    } catch (error) {
      console.error('文件上传失败:', error);
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    onPropertyChange?.('fileUrl', '');
    onPropertyChange?.('sheetName', '');
    onPropertyChange?.('data', []);
    onPropertyChange?.('columns', []);
    onPropertyChange?.('rowCount', 0);
  };

  return (
    <div className="space-y-4 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Excel 文件</Label>
        {!ast.fileUrl && (
          <Button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="size-4 mr-2" />
            {isUploading ? '上传中...' : '上传 Excel'}
          </Button>
        )}

        {ast.fileUrl && (
          <div className="relative group border rounded-lg p-3 bg-accent/50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{ast.sheetName || '已上传'}</div>
                <div className="text-xs text-muted-foreground">
                  {ast.rowCount} 行 × {ast.columns.length} 列
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDelete}
            >
              <X className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {ast.fileUrl && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">工作表名称</Label>
            <Input
              value={ast.sheetName}
              onChange={(e) => onPropertyChange?.('sheetName', e.target.value)}
              placeholder="留空则使用第一个工作表"
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">起始行</Label>
            <Input
              type="number"
              min={1}
              value={ast.startRow}
              onChange={(e) => onPropertyChange?.('startRow', parseInt(e.target.value) || 1)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">包含表头</Label>
            <Switch
              checked={ast.hasHeader}
              onCheckedChange={(checked) => onPropertyChange?.('hasHeader', checked)}
            />
          </div>
        </>
      )}
    </div>
  );
};

const ExcelRender: React.FC<{ ast: ExcelUploadAst }> = ({ ast }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  if (ast.state === 'pending' || !ast.data || ast.data.length === 0) {
    return null;
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = ast.data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(ast.data.length / pageSize);

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">总行数</div>
          <div className="text-sm font-mono px-2 py-1 rounded bg-green-900/30 text-green-400 inline-block">
            {ast.rowCount} 行
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">列数</div>
          <div className="text-sm font-mono px-2 py-1 rounded bg-blue-900/30 text-blue-400 inline-block">
            {ast.columns.length} 列
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">数据预览</div>
        <div className="max-h-[400px] overflow-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-accent/50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  #
                </th>
                {ast.columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-accent/20 transition-colors">
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {startIndex + rowIndex + 1}
                  </td>
                  {ast.columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-xs font-mono text-foreground whitespace-nowrap"
                    >
                      {row[col] !== null && row[col] !== undefined && row[col] !== ''
                        ? String(row[col])
                        : <span className="text-muted-foreground italic">-</span>
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
    </div>
  );
};

@Injectable()
export class ExcelUploadAstRender {
  @Render(ExcelUploadAst)
  render(ast: ExcelUploadAst) {
    return <ExcelRender ast={ast} />;
  }

  @Setting(ExcelUploadAst)
  setting(ast: ExcelUploadAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <ExcelSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(ExcelUploadAst)
  preview(ast: ExcelUploadAst) {
    return <ExcelPreview ast={ast} />;
  }
}
