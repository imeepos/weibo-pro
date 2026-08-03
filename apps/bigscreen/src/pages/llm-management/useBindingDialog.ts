import { useState } from 'react';
import { root } from '@sker/core';
import {
  LlmModelProvidersController,
  type LlmModelProviderWithRelations
} from '@sker/sdk';

export interface BindingForm {
  modelId: string;
  providerId: string;
  modelName: string;
  tierLevel: number;
  supportsThinking: boolean;
  enabled: boolean;
}

export const DEFAULT_BINDING_FORM: BindingForm = {
  modelId: '',
  providerId: '',
  modelName: '',
  tierLevel: 1,
  supportsThinking: false,
  enabled: true
};

/**
 * 绑定关系新增/编辑对话框的状态、提交逻辑与启用/禁用切换。
 */
export function useBindingDialog({ loadData }: { loadData: (resetPage?: boolean) => void }) {
  const bindingsCtrl = root.get(LlmModelProvidersController);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BindingForm>(DEFAULT_BINDING_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openDialog = (binding?: LlmModelProviderWithRelations) => {
    if (binding) {
      setEditingId(binding.id);
      setForm({
        modelId: binding.modelId,
        providerId: binding.providerId,
        modelName: binding.modelName,
        tierLevel: binding.tierLevel || 1,
        supportsThinking: binding.supportsThinking || false,
        enabled: binding.enabled !== false
      });
    } else {
      setEditingId(null);
      setForm(DEFAULT_BINDING_FORM);
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.modelId || !form.providerId || !form.modelName) return;
    if (editingId) {
      await bindingsCtrl.update(editingId, form);
    } else {
      await bindingsCtrl.create(form);
    }
    setOpen(false);
    loadData();
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    if (currentEnabled) {
      await bindingsCtrl.disable(id);
    } else {
      await bindingsCtrl.enable(id);
    }
    loadData(false);
  };

  return { open, setOpen, form, setForm, editingId, openDialog, handleSubmit, handleToggleEnabled };
}
