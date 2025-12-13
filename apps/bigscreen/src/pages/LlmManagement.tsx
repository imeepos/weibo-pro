import React, { useState, useEffect } from 'react';
import { root } from '@sker/core';
import {
  LlmProvidersController,
  LlmModelsController,
  LlmModelProvidersController,
  type LlmModelProviderWithRelations
} from '@sker/sdk';
import type { LlmProvider, LlmModel } from '@sker/entities';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sker/ui/components/ui/dialog';
import { Badge } from '@sker/ui/components/ui/badge';
import { PlusIcon, TrashIcon, PencilIcon, RefreshCwIcon, ServerIcon, CpuIcon, LinkIcon, HomeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils';

type DeleteTarget = { type: 'provider' | 'model' | 'binding'; id: string; name: string } | null;

const LlmManagement: React.FC = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [bindings, setBindings] = useState<LlmModelProviderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [bindingPage, setBindingPage] = useState(1);
  const [bindingPageSize] = useState(20);

  const providersCtrl = root.get(LlmProvidersController);
  const modelsCtrl = root.get(LlmModelsController);
  const bindingsCtrl = root.get(LlmModelProvidersController);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m, b] = await Promise.all([
        providersCtrl.findAll(),
        modelsCtrl.findAll(),
        bindingsCtrl.findAll()
      ]);
      setProviders(p);
      setModels(m);
      setBindings(b);
      setBindingPage(1);
    } finally {
      setLoading(false);
    }
  };

  // Provider Dialog
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: '', protocol: 'anthropic', base_url: '', api_key: '' });
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  const openProviderDialog = (provider?: LlmProvider) => {
    if (provider) {
      setEditingProvider(provider.id);
      setProviderForm({ name: provider.name, protocol: provider.protocol || 'anthropic', base_url: provider.base_url, api_key: provider.api_key });
    } else {
      setEditingProvider(null);
      setProviderForm({ name: '', protocol: 'anthropic', base_url: '', api_key: '' });
    }
    setProviderDialogOpen(true);
  };

  const handleProviderSubmit = async () => {
    if (!providerForm.name || !providerForm.base_url) return;
    if (editingProvider) {
      await providersCtrl.update(editingProvider, providerForm);
    } else {
      await providersCtrl.create(providerForm);
    }
    setProviderDialogOpen(false);
    loadData();
  };

  const handleDeleteProvider = async (id: string) => {
    const provider = providers.find(p => p.id === id);
    setDeleteTarget({ type: 'provider', id, name: provider?.name || '' });
  };

  const handleResetScore = async (id: string) => {
    await providersCtrl.updateScore(id, 10000);
    loadData();
  };

  const handleDecreaseScore = async (id: string, amount: number = 1000) => {
    const provider = providers.find(p => p.id === id);
    if (provider) {
      const newScore = Math.max(0, provider.score - amount);
      await providersCtrl.updateScore(id, newScore);
      loadData();
    }
  };

  const handleIncreaseScore = async (id: string, amount: number = 1000) => {
    const provider = providers.find(p => p.id === id);
    if (provider) {
      const newScore = Math.min(10000, provider.score + amount);
      await providersCtrl.updateScore(id, newScore);
      loadData();
    }
  };

  const [editingScoreProvider, setEditingScoreProvider] = useState<string | null>(null);
  const [editingScoreValue, setEditingScoreValue] = useState<number>(0);

  const handleEditScore = (provider: LlmProvider) => {
    setEditingScoreProvider(provider.id);
    setEditingScoreValue(provider.score);
  };

  const handleSaveScore = async () => {
    if (!editingScoreProvider) return;
    await providersCtrl.updateScore(editingScoreProvider, editingScoreValue);
    setEditingScoreProvider(null);
    loadData();
  };

  // Model Dialog
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '' });
  const [editingModel, setEditingModel] = useState<string | null>(null);

  const openModelDialog = (model?: LlmModel) => {
    if (model) {
      setEditingModel(model.id);
      setModelForm({ name: model.name });
    } else {
      setEditingModel(null);
      setModelForm({ name: '' });
    }
    setModelDialogOpen(true);
  };

  const handleModelSubmit = async () => {
    if (!modelForm.name) return;
    if (editingModel) {
      await modelsCtrl.update(editingModel, modelForm);
    } else {
      await modelsCtrl.create(modelForm);
    }
    setModelDialogOpen(false);
    loadData();
  };

  const handleDeleteModel = async (id: string) => {
    const model = models.find(m => m.id === id);
    setDeleteTarget({ type: 'model', id, name: model?.name || '' });
  };

  // Binding Dialog
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [bindingForm, setBindingForm] = useState({ modelId: '', providerId: '', modelName: '', tierLevel: 1 });
  const [editingBinding, setEditingBinding] = useState<string | null>(null);

  const openBindingDialog = (binding?: LlmModelProviderWithRelations) => {
    if (binding) {
      setEditingBinding(binding.id);
      setBindingForm({
        modelId: binding.modelId,
        providerId: binding.providerId,
        modelName: binding.modelName,
        tierLevel: binding.tierLevel || 1
      });
    } else {
      setEditingBinding(null);
      setBindingForm({ modelId: '', providerId: '', modelName: '', tierLevel: 1 });
    }
    setBindingDialogOpen(true);
  };

  const handleBindingSubmit = async () => {
    if (!bindingForm.modelId || !bindingForm.providerId || !bindingForm.modelName) return;
    if (editingBinding) {
      await bindingsCtrl.update(editingBinding, bindingForm);
    } else {
      await bindingsCtrl.create(bindingForm);
    }
    setBindingDialogOpen(false);
    loadData();
  };

  const handleDeleteBinding = async (id: string) => {
    const binding = bindings.find(b => b.id === id);
    setDeleteTarget({ type: 'binding', id, name: binding?.model?.name || '' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    if (type === 'provider') await providersCtrl.remove(id);
    else if (type === 'model') await modelsCtrl.remove(id);
    else if (type === 'binding') await bindingsCtrl.remove(id);
    setDeleteTarget(null);
    loadData();
  };

  const deleteTypeLabels = { provider: '提供商', model: '模型', binding: '绑定' };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid h-full gap-4 lg:grid-cols-4">
        {/* 提供商 */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ServerIcon className="size-4" />
              提供商
            </CardTitle>
            <div className="flex-1"></div>
            <button
              onClick={() => openProviderDialog()}
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
                      {editingScoreProvider === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editingScoreValue}
                            onChange={(e) => setEditingScoreValue(Number(e.target.value))}
                            className="w-20 rounded border bg-background px-2 py-1 text-xs"
                            min="0"
                            max="10000"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveScore}
                            className="text-green-500 hover:text-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingScoreProvider(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditScore(p)}
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
                        onClick={() => handleIncreaseScore(p.id, 1000)}
                        className="mr-1 text-green-500 hover:text-green-600"
                        title="上调健康分 +1000"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleDecreaseScore(p.id, 1000)}
                        className="mr-1 text-orange-500 hover:text-orange-600"
                        title="下调健康分 -1000"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleResetScore(p.id)}
                        className="mr-1 text-blue-500 hover:text-blue-600"
                        title="重置健康分"
                      >
                        <RefreshCwIcon className="size-3" />
                      </button>
                      <button
                        onClick={() => openProviderDialog(p)}
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

        {/* 模型 */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CpuIcon className="size-4" />
              模型

            </CardTitle>
            <div className="flex-1"></div>
            <button
              onClick={() => openModelDialog()}
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
                        onClick={() => openModelDialog(m)}
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

        {/* 绑定关系 */}
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex flex-row items-center gap-2 text-sm">
              <LinkIcon className="size-4" />
              绑定关系

            </CardTitle>
            <div className="flex-1"></div>
            <button
              onClick={() => openBindingDialog()}
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
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedBindings = [...bindings].sort((a, b) => {
                      if (a.tierLevel !== b.tierLevel) {
                        return a.tierLevel - b.tierLevel;
                      }
                      const providerA = a.provider?.name || a.providerId;
                      const providerB = b.provider?.name || b.providerId;
                      return providerA.localeCompare(providerB);
                    });
                    const startIndex = (bindingPage - 1) * bindingPageSize;
                    const endIndex = startIndex + bindingPageSize;
                    const paginatedBindings = sortedBindings.slice(startIndex, endIndex);

                    return paginatedBindings.map((b) => (
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
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openBindingDialog(b)}
                            className="mr-1 text-muted-foreground hover:text-foreground"
                          >
                            <PencilIcon className="size-3" />
                          </button>
                          <button onClick={() => handleDeleteBinding(b.id)} className="text-red-500 hover:text-red-600">
                            <TrashIcon className="size-3" />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="text-xs text-muted-foreground">
                共 {bindings.length} 条，第 {bindings.length === 0 ? 0 : (bindingPage - 1) * bindingPageSize + 1}-{Math.min(bindingPage * bindingPageSize, bindings.length)} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBindingPage(p => Math.max(1, p - 1))}
                  disabled={bindingPage === 1}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  上一页
                </button>
                <span className="text-xs">
                  {bindingPage} / {Math.ceil(bindings.length / bindingPageSize) || 1}
                </span>
                <button
                  onClick={() => setBindingPage(p => Math.min(Math.ceil(bindings.length / bindingPageSize), p + 1))}
                  disabled={bindingPage >= Math.ceil(bindings.length / bindingPageSize)}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  下一页
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Dialog */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? '编辑提供商' : '添加提供商'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              placeholder="名称"
              value={providerForm.name}
              onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              value={providerForm.protocol}
              onChange={(e) => setProviderForm({ ...providerForm, protocol: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <input
              placeholder="Base URL"
              value={providerForm.base_url}
              onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="API Key"
              type="password"
              value={providerForm.api_key}
              onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setProviderDialogOpen(false)}
              className="rounded-md bg-muted px-3 py-1.5 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleProviderSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              {editingProvider ? '保存' : '添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Model Dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? '编辑模型' : '添加模型'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              placeholder="模型名称"
              value={modelForm.name}
              onChange={(e) => setModelForm({ name: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setModelDialogOpen(false)}
              className="rounded-md bg-muted px-3 py-1.5 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleModelSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              {editingModel ? '保存' : '添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Binding Dialog */}
      <Dialog open={bindingDialogOpen} onOpenChange={setBindingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBinding ? '编辑绑定' : '添加绑定'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <select
              value={bindingForm.modelId}
              onChange={(e) => setBindingForm({ ...bindingForm, modelId: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">选择模型</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={bindingForm.providerId}
              onChange={(e) => setBindingForm({ ...bindingForm, providerId: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">选择提供商</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              placeholder="提供商模型名称"
              value={bindingForm.modelName}
              onChange={(e) => setBindingForm({ ...bindingForm, modelName: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              value={bindingForm.tierLevel}
              onChange={(e) => setBindingForm({ ...bindingForm, tierLevel: Number(e.target.value) })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value={1}>第一梯队（优先）</option>
              <option value={2}>第二梯队（回退）</option>
              <option value={3}>第三梯队（兜底）</option>
            </select>
          </div>
          <DialogFooter>
            <button
              onClick={() => setBindingDialogOpen(false)}
              className="rounded-md bg-muted px-3 py-1.5 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleBindingSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              {editingBinding ? '保存' : '添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除{deleteTarget && deleteTypeLabels[deleteTarget.type]}
            {deleteTarget?.name && <span className="font-medium text-foreground">「{deleteTarget.name}」</span>}吗？
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-md bg-muted px-3 py-1.5 text-sm"
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white"
            >
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LlmManagement;
