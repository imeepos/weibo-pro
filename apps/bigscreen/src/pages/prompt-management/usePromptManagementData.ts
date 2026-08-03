import { useCallback, useEffect, useState } from 'react';
import { root } from '@sker/core';
import {
  PromptRolesController,
  PromptSkillsController,
  type PromptRoleWithSkills,
} from '@sker/sdk';
import type { PromptSkillEntity } from '@sker/entities';
import { SKILLS_PER_PAGE } from './constants';
import { paginateSkills } from './utils';
import type { DeleteTarget } from './types';

/**
 * Prompt 管理页核心数据：角色、技能列表的加载、分页与删除确认逻辑。
 */
export function usePromptManagementData() {
  const [roles, setRoles] = useState<PromptRoleWithSkills[]>([]);
  const [skills, setSkills] = useState<PromptSkillEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillsPage, setSkillsPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const rolesCtrl = root.get(PromptRolesController);
  const skillsCtrl = root.get(PromptSkillsController);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([rolesCtrl.findAll(), skillsCtrl.findAll()]);
      setRoles(r);
      setSkills(s);
      setSkillsPage(1); // 重置到第一页
    } finally {
      setLoading(false);
    }
  }, [rolesCtrl, skillsCtrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'role') await rolesCtrl.remove(deleteTarget.id);
    else await skillsCtrl.remove(deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  }, [deleteTarget, rolesCtrl, skillsCtrl, loadData]);

  const totalSkillsPages = Math.ceil(skills.length / SKILLS_PER_PAGE);
  const paginatedSkills = paginateSkills(skills, skillsPage, SKILLS_PER_PAGE);

  return {
    roles,
    skills,
    loading,
    loadData,
    rolesCtrl,
    skillsCtrl,
    skillsPage,
    setSkillsPage,
    totalSkillsPages,
    paginatedSkills,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
  };
}
