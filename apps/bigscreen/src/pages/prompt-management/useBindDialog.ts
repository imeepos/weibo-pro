import { useMemo, useState } from 'react';
import type { PromptRolesController, PromptRoleWithSkills } from '@sker/sdk';
import type { PromptSkillEntity } from '@sker/entities';
import { groupAvailableSkills } from './utils';
import type { BindForm } from './types';

export const DEFAULT_BIND_FORM: BindForm = { skill_id: '', ref_type: 'required' };

/**
 * 角色-技能绑定对话框的状态、可用技能分组与提交逻辑。
 */
export function useBindDialog(
  rolesCtrl: PromptRolesController,
  skills: PromptSkillEntity[],
  roles: PromptRoleWithSkills[],
  loadData: () => void
) {
  const [open, setOpen] = useState(false);
  const [bindForm, setBindForm] = useState<BindForm>(DEFAULT_BIND_FORM);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const openDialog = (roleId: string) => {
    setSelectedRole(roleId);
    setBindForm(DEFAULT_BIND_FORM);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRole || !bindForm.skill_id) return;
    await rolesCtrl.addSkill(selectedRole, bindForm);
    setOpen(false);
    loadData();
  };

  const selectedSkill = skills.find((s) => s.id === bindForm.skill_id);
  const groupedAvailableSkills = useMemo(
    () => groupAvailableSkills(skills, roles, selectedRole),
    [skills, roles, selectedRole]
  );

  return {
    open,
    setOpen,
    bindForm,
    setBindForm,
    selectedRole,
    setSelectedRole,
    searchOpen,
    setSearchOpen,
    openDialog,
    handleSubmit,
    selectedSkill,
    groupedAvailableSkills,
  };
}
