import { useState } from 'react';
import { root } from '@sker/core';
import { LlmModelsController } from '@sker/sdk';
import type { LlmModel } from '@sker/entities';

/**
 * 模型新增/编辑对话框的状态与提交逻辑。
 */
export function useModelDialog({ loadData }: { loadData: () => void }) {
  const modelsCtrl = root.get(LlmModelsController);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const openDialog = (model?: LlmModel) => {
    if (model) {
      setEditingId(model.id);
      setForm({ name: model.name });
    } else {
      setEditingId(null);
      setForm({ name: '' });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    if (editingId) {
      await modelsCtrl.update(editingId, form);
    } else {
      await modelsCtrl.create(form);
    }
    setOpen(false);
    loadData();
  };

  return { open, setOpen, form, setForm, editingId, openDialog, handleSubmit };
}
