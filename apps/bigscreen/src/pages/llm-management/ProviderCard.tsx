import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sker/ui/components/ui/dialog';
import { PlusIcon, TrashIcon, PencilIcon, RefreshCwIcon, ServerIcon } from 'lucide-react';
import { cn } from '@/utils';
import type { LlmProvider } from '@sker/entities';
import type { DeleteTarget } from './types';
import { useProviderDialog } from './useProviderDialog';
import { useProviderScore } from './useProviderScore';

interface ProviderCardProps {
  providers: LlmProvider[];
  loadData: () => void;
  onRequestDelete: (target: DeleteTarget) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ providers, loadData, onRequestDelete }) => {
  const dialog = useProviderDialog({ loadData });
  const score = useProviderScore({ loadData, providers });

  const handleDeleteProvider = (id: string) => {
    const provider = providers.find((p) => p.id === id);
    onRequestDelete({ type: 'provider', id, name: provider?.name || '' });
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ServerIcon className="size-4" />
            提供商
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
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium">健康分</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3" title={p.base_url}>{p.name}</td>
                  <td className="px-4 py-3">
                    {score.editingProvider === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={score.editingValue}
                          onChange={(e) => score.setEditingValue(Number(e.target.value))}
                          className="w-20 rounded border bg-background px-2 py-1 text-xs"
                          min="0"
                          max="1000000"
                          autoFocus
                        />
                        <button
                          onClick={score.handleSaveScore}
                          className="text-green-500 hover:text-green-600"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => score.setEditingProvider(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => score.handleEditScore(p)}
                        className={cn(
                          'font-medium hover:underline',
                          p.score >= 800 ? 'text-green-500' : p.score >= 500 ? 'text-yellow-500' : 'text-red-500'
                        )}
                        title="点击编辑健康分"
                      >
                        {p.score}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => score.handleIncreaseScore(p.id, 1000)}
                      className="mr-1 text-green-500 hover:text-green-600"
                      title="上调健康分 +1000"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => score.handleDecreaseScore(p.id, 1000)}
                      className="mr-1 text-orange-500 hover:text-orange-600"
                      title="下调健康分 -1000"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => score.handleResetScore(p.id)}
                      className="mr-1 text-blue-500 hover:text-blue-600"
                      title="重置健康分"
                    >
                      <RefreshCwIcon className="size-3" />
                    </button>
                    <button
                      onClick={() => dialog.openDialog(p)}
                      className="mr-1 text-muted-foreground hover:text-foreground"
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button onClick={() => handleDeleteProvider(p.id)} className="text-red-500 hover:text-red-600">
                      <TrashIcon className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Provider Dialog */}
      <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editingId ? '编辑提供商' : '添加提供商'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              placeholder="名称"
              value={dialog.form.name}
              onChange={(e) => dialog.setForm({ ...dialog.form, name: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              value={dialog.form.protocol}
              onChange={(e) => dialog.setForm({ ...dialog.form, protocol: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="codex">Codex</option>
            </select>
            <input
              placeholder="Base URL"
              value={dialog.form.base_url}
              onChange={(e) => dialog.setForm({ ...dialog.form, base_url: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="API Key"
              type="password"
              value={dialog.form.api_key}
              onChange={(e) => dialog.setForm({ ...dialog.form, api_key: e.target.value })}
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
