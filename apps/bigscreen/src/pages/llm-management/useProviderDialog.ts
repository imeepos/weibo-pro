import { useState } from 'react';
import { root } from '@sker/core';
import { LlmProvidersController } from '@sker/sdk';
import type { LlmProvider } from '@sker/entities';

export interface ProviderForm {
  name: string;
  protocol: string;
  base_url: string;
  api_key: string;
}

export const DEFAULT_PROVIDER_FORM: ProviderForm = {
  name: '',
  protocol: 'anthropic',
  base_url: '',
  api_key: '',
};

/**
 * 提供商新增/编辑对话框的状态与提交逻辑。
 */
export function useProviderDialog({ loadData }: { loadData: () => void }) {
  const providersCtrl = root.get(LlmProvidersController);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProviderForm>(DEFAULT_PROVIDER_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openDialog = (provider?: LlmProvider) => {
    if (provider) {
      setEditingId(provider.id);
      setForm({
        name: provider.name,
        protocol: provider.protocol || 'anthropic',
        base_url: provider.base_url,
        api_key: provider.api_key
      });
    } else {
      setEditingId(null);
      setForm(DEFAULT_PROVIDER_FORM);
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.base_url) return;
    if (editingId) {
      await providersCtrl.update(editingId, form);
    } else {
      await providersCtrl.create(form);
    }
    setOpen(false);
    loadData();
  };

  return { open, setOpen, form, setForm, editingId, openDialog, handleSubmit };
}
