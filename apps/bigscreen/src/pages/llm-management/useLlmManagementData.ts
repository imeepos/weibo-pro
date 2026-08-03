import { useCallback, useEffect, useState } from 'react';
import { root } from '@sker/core';
import {
  LlmProvidersController,
  LlmModelsController,
  LlmModelProvidersController,
  type LlmModelProviderWithRelations
} from '@sker/sdk';
import type { LlmProvider, LlmModel } from '@sker/entities';
import type { DeleteTarget } from './types';

/**
 * LLM 管理页核心数据：提供商、模型、绑定关系列表的加载与删除确认逻辑。
 */
export function useLlmManagementData() {
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

  const loadData = useCallback(async (resetPage = true) => {
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
      if (resetPage) {
        setBindingPage(1);
      }
    } finally {
      setLoading(false);
    }
  }, [providersCtrl, modelsCtrl, bindingsCtrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    if (type === 'provider') await providersCtrl.remove(id);
    else if (type === 'model') await modelsCtrl.remove(id);
    else if (type === 'binding') await bindingsCtrl.remove(id);
    setDeleteTarget(null);
    loadData();
  }, [deleteTarget, providersCtrl, modelsCtrl, bindingsCtrl, loadData]);

  return {
    providers,
    models,
    bindings,
    loading,
    loadData,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    bindingPage,
    bindingPageSize,
    setBindingPage,
  };
}
