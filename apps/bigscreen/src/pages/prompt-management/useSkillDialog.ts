import { useState } from 'react';
import type { PromptSkillsController } from '@sker/sdk';
import type { PromptSkillEntity } from '@sker/entities';
import type { SkillForm } from './types';

export const DEFAULT_SKILL_FORM: SkillForm = {
  name: '',
  title: '',
  description: '',
  type: 'thought',
  content: '',
};

/**
 * 技能新增/编辑对话框的状态与提交逻辑。
 */
export function useSkillDialog(skillsCtrl: PromptSkillsController, loadData: () => void) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SkillForm>(DEFAULT_SKILL_FORM);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);

  const openDialog = (skill?: PromptSkillEntity) => {
    if (skill) {
      setEditingSkill(skill.id);
      setForm({
        name: skill.name,
        title: skill.title,
        description: skill.description || '',
        type: skill.type,
        content: skill.content,
      });
    } else {
      setEditingSkill(null);
      setForm(DEFAULT_SKILL_FORM);
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.title) return;
    const dto = { ...form };
    if (editingSkill) {
      await skillsCtrl.update(editingSkill, dto);
    } else {
      await skillsCtrl.create(dto);
    }
    setOpen(false);
    loadData();
  };

  return { open, setOpen, form, setForm, editingSkill, openDialog, handleSubmit };
}
