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
import { PlusIcon, TrashIcon, PencilIcon, RefreshCwIcon, ServerIcon, CpuIcon, LinkIcon, HomeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LlmManagement: React.FC = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [bindings, setBindings] = useState<LlmModelProviderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  // Provider Dialog
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: '', base_url: '', api_key: '' });
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  const openProviderDialog = (provider?: LlmProvider) => {
    if (provider) {
      setEditingProvider(provider.id);
      setProviderForm({ name: provider.name, base_url: provider.base_url, api_key: provider.api_key });
    } else {
      setEditingProvider(null);
      setProviderForm({ name: '', base_url: '', api_key: '' });
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
    if (!confirm('确定删除此提供商？')) return;
    await providersCtrl.remove(id);
    loadData();
  };

  const handleResetScore = async (id: string) => {
    await providersCtrl.updateScore(id, 10000);
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
    if (!confirm('确定删除此模型？')) return;
    await modelsCtrl.remove(id);
    loadData();
  };

  // Binding Dialog
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [bindingForm, setBindingForm] = useState({ modelId: '', providerId: '', modelName: '' });
  const [editingBinding, setEditingBinding] = useState<string | null>(null);

  const openBindingDialog = (binding?: LlmModelProviderWithRelations) => {
    if (binding) {
      setEditingBinding(binding.id);
      setBindingForm({
        modelId: binding.modelId,
        providerId: binding.providerId,
        modelName: binding.modelName
      });
    } else {
      setEditingBinding(null);
      setBindingForm({ modelId: '', providerId: '', modelName: '' });
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
    if (!confirm('确定删除此绑定？')) return;
    await bindingsCtrl.remove(id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid h-full gap-4 lg:grid-cols-3">
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
                  <th className="px-4 py-2 text-left font-medium">名称</th>
                  <th className="px-4 py-2 text-left font-medium">健康分</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2" title={p.base_url}>{p.name}</td>
                    <td className="px-4 py-2">
                      <span className={p.score >= 800 ? 'text-green-500' : p.score >= 500 ? 'text-yellow-500' : 'text-red-500'}>
                        {p.score}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
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
                  <th className="px-4 py-2 text-left font-medium">模型名称</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{m.name}</td>
                    <td className="px-4 py-2 text-right">
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
        <Card className="flex flex-col">
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
          <CardContent className="flex-1 overflow-auto p-0">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">模型</th>
                  <th className="px-4 py-2 text-left font-medium">提供商</th>
                  <th className="px-4 py-2 text-left font-medium">提供商模型</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{b.model?.name || b.modelId}</td>
                    <td className="px-4 py-2" title={b.modelName}>{b.provider?.name || b.providerId}</td>
                    <td className="px-4 py-2">{b.modelName}</td>
                    <td className="px-4 py-2 text-right">
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
                ))}
              </tbody>
            </table>
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
    </div>
  );
};

export default LlmManagement;
