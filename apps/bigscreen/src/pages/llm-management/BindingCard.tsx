import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sker/ui/components/ui/dialog';
import { Badge } from '@sker/ui/components/ui/badge';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  LinkIcon,
  SearchIcon,
  ToggleLeftIcon,
  ToggleRightIcon
} from 'lucide-react';
import { cn } from '@/utils';
import type { LlmProvider, LlmModel } from '@sker/entities';
import type { LlmModelProviderWithRelations } from '@sker/sdk';
import type { DeleteTarget } from './types';
import { paginateBindings } from './helpers';
import { useBindingDialog } from './useBindingDialog';

interface BindingCardProps {
  bindings: LlmModelProviderWithRelations[];
  models: LlmModel[];
  providers: LlmProvider[];
  loadData: (resetPage?: boolean) => void;
  onRequestDelete: (target: DeleteTarget) => void;
  onPromptAnalysis: () => void;
  bindingPage: number;
  bindingPageSize: number;
  setBindingPage: React.Dispatch<React.SetStateAction<number>>;
}

export const BindingCard: React.FC<BindingCardProps> = ({
  bindings,
  models,
  providers,
  loadData,
  onRequestDelete,
  onPromptAnalysis,
  bindingPage,
  bindingPageSize,
  setBindingPage
}) => {
  const dialog = useBindingDialog({ loadData });

  const handleDeleteBinding = (id: string) => {
    const binding = bindings.find((b) => b.id === id);
    onRequestDelete({ type: 'binding', id, name: binding?.model?.name || '' });
  };

  const paginatedBindings = paginateBindings(bindings, bindingPage, bindingPageSize);
  const totalPages = Math.ceil(bindings.length / bindingPageSize) || 1;

  return (
    <>
      <Card className="flex flex-col lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex flex-row items-center gap-2 text-sm">
            <LinkIcon className="size-4" />
            绑定关系
          </CardTitle>
          <div className="flex-1"></div>
          <button
            onClick={onPromptAnalysis}
            className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground mr-2"
            title="查看提示词分析"
          >
            <SearchIcon className="size-3" />
            提示词分析
          </button>
          <button
            onClick={() => dialog.openDialog()}
            className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
          >
            <PlusIcon className="size-3" />
            添加
          </button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">模型</th>
                  <th className="px-4 py-3 text-left font-medium">提供商</th>
                  <th className="px-4 py-3 text-left font-medium">提供商模型</th>
                  <th className="px-4 py-3 text-left font-medium">梯队</th>
                  <th className="px-4 py-3 text-center font-medium">Thinking</th>
                  <th className="px-4 py-3 text-center font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBindings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{b.model?.name || b.modelId}</td>
                    <td className="px-4 py-3" title={b.modelName}>{b.provider?.name || b.providerId}</td>
                    <td className="px-4 py-3">{b.modelName}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={b.tierLevel === 1 ? 'default' : b.tierLevel === 2 ? 'secondary' : 'outline'}
                        className={cn(
                          'text-[10px]',
                          b.tierLevel === 1 && 'bg-green-500 hover:bg-green-600',
                          b.tierLevel === 2 && 'bg-yellow-500 hover:bg-yellow-600',
                          b.tierLevel === 3 && 'bg-gray-500 hover:bg-gray-600'
                        )}
                      >
                        T{b.tierLevel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.supportsThinking ? (
                        <Badge className="bg-purple-500 hover:bg-purple-600 text-[10px]">✓</Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => dialog.handleToggleEnabled(b.id, b.enabled !== false)}
                        className={cn(
                          'transition-colors',
                          b.enabled !== false ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-500'
                        )}
                        title={b.enabled !== false ? '点击禁用' : '点击启用'}
                      >
                        {b.enabled !== false ? (
                          <ToggleRightIcon className="size-5" />
                        ) : (
                          <ToggleLeftIcon className="size-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => dialog.openDialog(b)}
                        className="mr-1 text-muted-foreground hover:text-foreground"
                      >
                        <PencilIcon className="size-3" />
                      </button>
                      <button onClick={() => handleDeleteBinding(b.id)} className="text-red-500 hover:text-red-600">
                        <TrashIcon className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-xs text-muted-foreground">
              共 {bindings.length} 条，第 {bindings.length === 0 ? 0 : (bindingPage - 1) * bindingPageSize + 1}-{Math.min(bindingPage * bindingPageSize, bindings.length)} 条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBindingPage((p) => Math.max(1, p - 1))}
                disabled={bindingPage === 1}
                className="rounded-md border px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                上一页
              </button>
              <span className="text-xs">
                {bindingPage} / {totalPages}
              </span>
              <button
                onClick={() => setBindingPage((p) => Math.min(totalPages, p + 1))}
                disabled={bindingPage >= totalPages}
                className="rounded-md border px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                下一页
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Binding Dialog */}
      <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editingId ? '编辑绑定' : '添加绑定'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <select
              value={dialog.form.modelId}
              onChange={(e) => dialog.setForm({ ...dialog.form, modelId: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">选择模型</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={dialog.form.providerId}
              onChange={(e) => dialog.setForm({ ...dialog.form, providerId: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">选择提供商</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              placeholder="提供商模型名称"
              value={dialog.form.modelName}
              onChange={(e) => dialog.setForm({ ...dialog.form, modelName: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              value={dialog.form.tierLevel}
              onChange={(e) => dialog.setForm({ ...dialog.form, tierLevel: Number(e.target.value) })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value={1}>第一梯队（优先）</option>
              <option value={2}>第二梯队（回退）</option>
              <option value={3}>第三梯队（兜底）</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dialog.form.supportsThinking}
                onChange={(e) => dialog.setForm({ ...dialog.form, supportsThinking: e.target.checked })}
                className="size-4 rounded border-gray-300"
              />
              <span className="text-sm">支持 Thinking 模式（Claude Extended Thinking）</span>
            </label>
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
