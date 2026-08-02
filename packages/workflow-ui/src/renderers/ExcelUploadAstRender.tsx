import React, { useState, useRef } from 'react';
import { Injectable, root } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { ExcelUploadAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Button } from '@sker/ui/components/ui/button';
import { UploadController } from '@sker/sdk';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { Switch } from '@sker/ui/components/ui/switch';

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
    onPropertyChange?.('data', null);
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

const ExcelRender: React.FC<{ ast: ExcelUploadAst }> = ({ ast: _ast }) => {
  return null;
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
