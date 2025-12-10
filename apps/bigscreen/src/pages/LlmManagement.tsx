import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { root } from '@sker/core';
import {
  LlmProvidersController,
  LlmModelsController,
  LlmModelProvidersController,
  type LlmModelProviderWithRelations
} from '@sker/sdk';
import type { LlmProvider, LlmModel, LlmModelProvider } from '@sker/entities';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { PlusIcon, TrashIcon, PencilIcon, ServerIcon, CpuIcon, LinkIcon } from 'lucide-react';

type Tab = 'providers' | 'models' | 'bindings';

const LlmManagement: React.FC = () => {
  const [tab, setTab] = useState<Tab>('providers');
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'providers', label: '提供商', icon: <ServerIcon className="size-4" /> },
    { key: 'models', label: '模型', icon: <CpuIcon className="size-4" /> },
    { key: 'bindings', label: '绑定关系', icon: <LinkIcon className="size-4" /> },
  ];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'providers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="mb-4 font-medium">{editingProvider ? '编辑提供商' : '添加提供商'}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
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
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleProviderSubmit}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                <PlusIcon className="size-4" />
                {editingProvider ? '保存' : '添加'}
              </button>
              {editingProvider && (
                <button
                  onClick={() => {
                    setEditingProvider(null);
                    setProviderForm({ name: '', base_url: '', api_key: '' });
                  }}
                  className="rounded-md bg-muted px-3 py-1.5 text-sm"
                >
                  取消
                </button>
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">名称</th>
                  <th className="px-4 py-3 text-left font-medium">Base URL</th>
                  <th className="px-4 py-3 text-left font-medium">健康分数</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.base_url}</td>
                    <td className="px-4 py-3">
                      <span className={p.score >= 8000 ? 'text-green-500' : p.score >= 5000 ? 'text-yellow-500' : 'text-red-500'}>
                        {p.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingProvider(p.id);
                          setProviderForm({ name: p.name, base_url: p.base_url, api_key: p.api_key });
                        }}
                        className="mr-2 text-muted-foreground hover:text-foreground"
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      <button onClick={() => handleDeleteProvider(p.id)} className="text-red-500 hover:text-red-600">
                        <TrashIcon className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {tab === 'models' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="mb-4 font-medium">{editingModel ? '编辑模型' : '添加模型'}</h3>
            <div className="flex gap-3">
              <input
                placeholder="模型名称 (如 gpt-4, claude-3-opus)"
                value={modelForm.name}
                onChange={(e) => setModelForm({ name: e.target.value })}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleModelSubmit}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                <PlusIcon className="size-4" />
                {editingModel ? '保存' : '添加'}
              </button>
              {editingModel && (
                <button
                  onClick={() => {
                    setEditingModel(null);
                    setModelForm({ name: '' });
                  }}
                  className="rounded-md bg-muted px-3 py-1.5 text-sm"
                >
                  取消
                </button>
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">模型名称</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingModel(m.id);
                          setModelForm({ name: m.name });
                        }}
                        className="mr-2 text-muted-foreground hover:text-foreground"
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      <button onClick={() => handleDeleteModel(m.id)} className="text-red-500 hover:text-red-600">
                        <TrashIcon className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {tab === 'bindings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="mb-4 font-medium">添加绑定</h3>
            <div className="grid gap-3 sm:grid-cols-3">
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
            <button
              onClick={handleBindingSubmit}
              className="mt-3 flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              <PlusIcon className="size-4" />
              添加绑定
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">标准模型</th>
                  <th className="px-4 py-3 text-left font-medium">提供商</th>
                  <th className="px-4 py-3 text-left font-medium">提供商模型名</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{b.model?.name || b.modelId}</td>
                    <td className="px-4 py-3">{b.provider?.name || b.providerId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.modelName}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteBinding(b.id)} className="text-red-500 hover:text-red-600">
                        <TrashIcon className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LlmManagement;
