import { useState } from 'react';
import type { PromptRolesController, PromptRoleWithSkills } from '@sker/sdk';
import type { RoleForm } from './types';

export const DEFAULT_ROLE_FORM: RoleForm = {
  role_id: '',
  name: '',
  description: '',
  personality: '',
  scope: 'user',
};

/**
 * 角色新增/编辑对话框的状态与提交逻辑。
 */
export function useRoleDialog(rolesCtrl: PromptRolesController, loadData: () => void) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RoleForm>(DEFAULT_ROLE_FORM);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const openDialog = (role?: PromptRoleWithSkills) => {
    if (role) {
      setEditingRole(role.id);
      setForm({
        role_id: role.role_id,
        name: role.name,
        description: role.description || '',
        personality: role.personality,
        scope: role.scope,
      });
    } else {
      setEditingRole(null);
      setForm(DEFAULT_ROLE_FORM);
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.role_id || !form.name || !form.personality) return;
    if (editingRole) {
      await rolesCtrl.update(editingRole, form);
    } else {
      await rolesCtrl.create(form);
    }
    setOpen(false);
    loadData();
  };

  return { open, setOpen, form, setForm, editingRole, openDialog, handleSubmit };
}
