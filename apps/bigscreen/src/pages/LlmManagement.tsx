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
import { PlusIcon, TrashIcon, PencilIcon, RefreshCwIcon, ServerIcon, CpuIcon, LinkIcon } from 'lucide-react';

const LlmManagement: React.FC = () => {
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

  // Provider CRUD
  const [providerForm, setProviderForm] = useState({ name: '', base_url: '', api_key: '' });
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  const handleProviderSubmit = async () => {
    if (!providerForm.name || !providerForm.base_url) return;
    if (editingProvider) {
      await providersCtrl.update(editingProvider, providerForm);
    } else {
      await providersCtrl.create(providerForm);
    }
    setProviderForm({ name: '', base_url: '', api_key: '' });
    setEditingProvider(null);
    loadData();
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('确定删除此提供商？')) return;
    await providersCtrl.remove(id);
    loadData();
  };

  const handleResetScore = async (id: string) => {
    await providersCtrl.updateScore(id, 1000);
    loadData();
  };

  // Model CRUD
  const [modelForm, setModelForm] = useState({ name: '' });
  const [editingModel, setEditingModel] = useState<string | null>(null);

  const handleModelSubmit = async () => {
    if (!modelForm.name) return;
    if (editingModel) {
      await modelsCtrl.update(editingModel, modelForm);
    } else {
      await modelsCtrl.create(modelForm);
    }
    setModelForm({ name: '' });
    setEditingModel(null);
    loadData();
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('确定删除此模型？')) return;
    await modelsCtrl.remove(id);
    loadData();
  };

  // Binding CRUD
  const [bindingForm, setBindingForm] = useState({ modelId: '', providerId: '', modelName: '' });

  const handleBindingSubmit = async () => {
    if (!bindingForm.modelId || !bindingForm.providerId || !bindingForm.modelName) return;
    await bindingsCtrl.create(bindingForm);
    setBindingForm({ modelId: '', providerId: '', modelName: '' });
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ServerIcon className="size-4" />
            提供商
          </div>
          <div className="glass-card p-3">
            <div className="grid gap-2">
              <input
                placeholder="名称"
                value={providerForm.name}
                onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Base URL"
                value={providerForm.base_url}
                onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
              <input
                placeholder="API Key"
                type="password"
                value={providerForm.api_key}
                onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleProviderSubmit}
                  className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                >
                  <PlusIcon className="size-3" />
                  {editingProvider ? '保存' : '添加'}
                </button>
                {editingProvider && (
                  <button
                    onClick={() => {
                      setEditingProvider(null);
                      setProviderForm({ name: '', base_url: '', api_key: '' });
                    }}
                    className="rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="glass-card flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">名称</th>
                  <th className="px-2 py-2 text-left font-medium">健康分</th>
                  <th className="px-2 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2" title={p.base_url}>{p.name}</td>
                    <td className="px-2 py-2">
                      <span className={p.score >= 800 ? 'text-green-500' : p.score >= 500 ? 'text-yellow-500' : 'text-red-500'}>
                        {p.score}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => handleResetScore(p.id)}
                        className="mr-1 text-blue-500 hover:text-blue-600"
                        title="重置健康分"
                      >
                        <RefreshCwIcon className="size-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingProvider(p.id);
                          setProviderForm({ name: p.name, base_url: p.base_url, api_key: p.api_key });
                        }}
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
          </div>
        </div>

        {/* 模型 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CpuIcon className="size-4" />
            模型
          </div>
          <div className="glass-card p-3">
            <div className="flex gap-2">
              <input
                placeholder="模型名称"
                value={modelForm.name}
                onChange={(e) => setModelForm({ name: e.target.value })}
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
              />
              <button
                onClick={handleModelSubmit}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                <PlusIcon className="size-3" />
                {editingModel ? '保存' : '添加'}
              </button>
              {editingModel && (
                <button
                  onClick={() => {
                    setEditingModel(null);
                    setModelForm({ name: '' });
                  }}
                  className="rounded-md bg-muted px-2 py-1 text-xs"
                >
                  取消
                </button>
              )}
            </div>
          </div>
          <div className="glass-card flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">模型名称</th>
                  <th className="px-2 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium">{m.name}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => {
                          setEditingModel(m.id);
                          setModelForm({ name: m.name });
                        }}
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
          </div>
        </div>

        {/* 绑定关系 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LinkIcon className="size-4" />
            绑定关系
          </div>
          <div className="glass-card p-3">
            <div className="grid gap-2">
              <select
                value={bindingForm.modelId}
                onChange={(e) => setBindingForm({ ...bindingForm, modelId: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">选择模型</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                value={bindingForm.providerId}
                onChange={(e) => setBindingForm({ ...bindingForm, providerId: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
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
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
              <button
                onClick={handleBindingSubmit}
                className="flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                <PlusIcon className="size-3" />
                添加绑定
              </button>
            </div>
          </div>
          <div className="glass-card flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">模型</th>
                  <th className="px-2 py-2 text-left font-medium">提供商</th>
                  <th className="px-2 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium">{b.model?.name || b.modelId}</td>
                    <td className="px-2 py-2" title={b.modelName}>{b.provider?.name || b.providerId}</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => handleDeleteBinding(b.id)} className="text-red-500 hover:text-red-600">
                        <TrashIcon className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LlmManagement;
