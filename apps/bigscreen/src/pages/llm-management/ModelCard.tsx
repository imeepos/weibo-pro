import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sker/ui/components/ui/dialog';
import { PlusIcon, TrashIcon, PencilIcon, CpuIcon } from 'lucide-react';
import type { LlmModel } from '@sker/entities';
import type { DeleteTarget } from './types';
import { useModelDialog } from './useModelDialog';

interface ModelCardProps {
  models: LlmModel[];
  loadData: () => void;
  onRequestDelete: (target: DeleteTarget) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({ models, loadData, onRequestDelete }) => {
  const dialog = useModelDialog({ loadData });

  const handleDeleteModel = (id: string) => {
    const model = models.find((m) => m.id === id);
    onRequestDelete({ type: 'model', id, name: model?.name || '' });
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CpuIcon className="size-4" />
            模型
          </CardTitle>
          <div className="flex-1"></div>
          <button
            onClick={() => dialog.openDialog()}
            className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
          >
            <PlusIcon className="size-3" />
            添加
          </button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-xs">
            <thead className="sticky top-0 border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">模型名称</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => dialog.openDialog(m)}
                      className="mr-1 text-muted-foreground hover:text-foreground"
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button onClick={() => handleDeleteModel(m.id)} className="text-red-500 hover:text-red-600">
                      <TrashIcon className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Model Dialog */}
      <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editingId ? '编辑模型' : '添加模型'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              placeholder="模型名称"
              value={dialog.form.name}
              onChange={(e) => dialog.setForm({ name: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => dialog.setOpen(false)}
              className="rounded-md bg-muted px-3 py-1.5 text-sm"
            >
              取消
            </button>
            <button
              onClick={dialog.handleSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              {dialog.editingId ? '保存' : '添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
