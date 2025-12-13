import React, { useState, useEffect, useMemo } from 'react';
import { root } from '@sker/core';
import {
  PromptRolesController,
  PromptSkillsController,
  type PromptRoleWithSkills
} from '@sker/sdk';
import type { PromptSkillEntity, PromptSkillType, PromptResourceScope } from '@sker/entities';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sker/ui/components/ui/dialog';
import { SimplePagination } from '@sker/ui/components/ui/simple-pagination';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@sker/ui/components/ui/command';
import { PlusIcon, TrashIcon, PencilIcon, UserIcon, WrenchIcon, LinkIcon, CheckIcon } from 'lucide-react';

const SKILL_TYPES: { value: PromptSkillType; label: string }[] = [
  { value: 'thought', label: '思维' },
  { value: 'execution', label: '执行' },
  { value: 'knowledge', label: '知识' },
  { value: 'decision', label: '决策' }
];

const SKILLS_PER_PAGE = 10;

const PromptManagement: React.FC = () => {
  const [roles, setRoles] = useState<PromptRoleWithSkills[]>([]);
  const [skills, setSkills] = useState<PromptSkillEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [skillsPage, setSkillsPage] = useState(1);

  const rolesCtrl = root.get(PromptRolesController);
  const skillsCtrl = root.get(PromptSkillsController);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([rolesCtrl.findAll(), skillsCtrl.findAll()]);
      setRoles(r);
      setSkills(s);
      setSkillsPage(1); // 重置到第一页
    } finally {
      setLoading(false);
    }
  };

  // 分页计算
  const totalSkillsPages = Math.ceil(skills.length / SKILLS_PER_PAGE);
  const paginatedSkills = useMemo(() => {
    const start = (skillsPage - 1) * SKILLS_PER_PAGE;
    return skills.slice(start, start + SKILLS_PER_PAGE);
  }, [skills, skillsPage]);

  // Role Dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ role_id: '', name: '', description: '', personality: '', scope: 'user' as PromptResourceScope });
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const openRoleDialog = (role?: PromptRoleWithSkills) => {
    if (role) {
      setEditingRole(role.id);
      setRoleForm({
        role_id: role.role_id,
        name: role.name,
        description: role.description || '',
        personality: role.personality,
        scope: role.scope
      });
    } else {
      setEditingRole(null);
      setRoleForm({ role_id: '', name: '', description: '', personality: '', scope: 'user' });
    }
    setRoleDialogOpen(true);
  };

  const handleRoleSubmit = async () => {
    if (!roleForm.role_id || !roleForm.name || !roleForm.personality) return;
    if (editingRole) {
      await rolesCtrl.update(editingRole, roleForm);
    } else {
      await rolesCtrl.create(roleForm);
    }
    setRoleDialogOpen(false);
    loadData();
  };

  // Skill Dialog
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillForm, setSkillForm] = useState({ name: '', title: '', description: '', type: 'thought' as PromptSkillType, content: '' });
  const [editingSkill, setEditingSkill] = useState<string | null>(null);

  const openSkillDialog = (skill?: PromptSkillEntity) => {
    if (skill) {
      setEditingSkill(skill.id);
      setSkillForm({
        name: skill.name,
        title: skill.title,
        description: skill.description || '',
        type: skill.type,
        content: skill.content
      });
    } else {
      setEditingSkill(null);
      setSkillForm({ name: '', title: '', description: '', type: 'thought', content: '' });
    }
    setSkillDialogOpen(true);
  };

  const handleSkillSubmit = async () => {
    if (!skillForm.name || !skillForm.title) return;
    const dto = { ...skillForm };
    if (editingSkill) {
      await skillsCtrl.update(editingSkill, dto);
    } else {
      await skillsCtrl.create(dto);
    }
    setSkillDialogOpen(false);
    loadData();
  };

  // Bind Skill Dialog
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [bindForm, setBindForm] = useState({ skill_id: '', ref_type: 'required' });
  const [skillSearchOpen, setSkillSearchOpen] = useState(false);

  const openBindDialog = (roleId: string) => {
    setSelectedRole(roleId);
    setBindForm({ skill_id: '', ref_type: 'required' });
    setBindDialogOpen(true);
  };

  const handleBindSubmit = async () => {
    if (!selectedRole || !bindForm.skill_id) return;
    await rolesCtrl.addSkill(selectedRole, bindForm);
    setBindDialogOpen(false);
    loadData();
  };

  const selectedSkill = skills.find(s => s.id === bindForm.skill_id);

  // 按类型分组技能
  const groupedAvailableSkills = useMemo(() => {
    const currentRole = roles.find(r => r.id === selectedRole);
    const boundSkillIds = new Set(currentRole?.skill_refs?.map(ref => ref.skill_id) || []);
    const available = skills.filter(s => !boundSkillIds.has(s.id));

    return SKILL_TYPES.reduce((acc, type) => {
      acc[type.value] = available.filter(s => s.type === type.value);
      return acc;
    }, {} as Record<PromptSkillType, PromptSkillEntity[]>);
  }, [skills, roles, selectedRole]);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'role' | 'skill'; id: string; name: string } | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'role') await rolesCtrl.remove(deleteTarget.id);
    else await skillsCtrl.remove(deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  }

  const currentRole = roles.find(r => r.id === selectedRole);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid h-full gap-4 lg:grid-cols-3">
        {/* 角色列表 */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserIcon className="size-4" />
              角色
            </CardTitle>
            <button
              onClick={() => openRoleDialog()}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
            >
              <PlusIcon className="size-3" />
              添加
            </button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <div className="divide-y">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className={`cursor-pointer p-3 hover:bg-muted/50 ${selectedRole === r.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedRole(r.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.role_id}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openRoleDialog(r); }} className="text-muted-foreground hover:text-foreground">
                        <PencilIcon className="size-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'role', id: r.id, name: r.name }); }} className="text-red-500 hover:text-red-600">
                        <TrashIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 角色技能绑定 */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <LinkIcon className="size-4" />
              {currentRole ? `${currentRole.name} 的技能` : '选择角色查看技能'}
            </CardTitle>
            {currentRole && (
              <button
                onClick={() => openBindDialog(currentRole.id)}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                <PlusIcon className="size-3" />
                绑定
              </button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {currentRole?.skill_refs?.length ? (
              <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">技能</th>
                    <th className="px-4 py-2 text-left font-medium">类型</th>
                    <th className="px-4 py-2 text-left font-medium">必需</th>
                    <th className="px-4 py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRole.skill_refs.map((ref) => (
                    <tr key={ref.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{ref.skill?.title || ref.skill_id}</td>
                      <td className="px-4 py-2">{SKILL_TYPES.find(t => t.value === ref.skill_type)?.label}</td>
                      <td className="px-4 py-2">{ref.ref_type === 'required' ? '是' : '否'}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => rolesCtrl.removeSkill(currentRole.id, ref.skill_id).then(loadData)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <TrashIcon className="size-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {currentRole ? '暂无绑定技能' : '请先选择角色'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 技能列表 */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <WrenchIcon className="size-4" />
              技能库
            </CardTitle>
            <button
              onClick={() => openSkillDialog()}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
            >
              <PlusIcon className="size-3" />
              添加
            </button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 flex-1 p-0 overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">名称</th>
                    <th className="px-4 py-2 text-left font-medium">类型</th>
                    <th className="px-4 py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSkills.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <div className="font-medium">{s.title}</div>
                        <div className="text-muted-foreground">{s.name}</div>
                      </td>
                      <td className="px-4 py-2">{SKILL_TYPES.find(t => t.value === s.type)?.label}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => openSkillDialog(s)} className="mr-1 text-muted-foreground hover:text-foreground">
                          <PencilIcon className="size-3" />
                        </button>
                        <button onClick={() => setDeleteTarget({ type: 'skill', id: s.id, name: s.title })} className="text-red-500 hover:text-red-600">
                          <TrashIcon className="size-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalSkillsPages > 1 && (
              <div className="px-4 py-2 border-t bg-muted/20">
                <SimplePagination
                  currentPage={skillsPage}
                  totalPages={totalSkillsPages}
                  onPageChange={setSkillsPage}
                  showInfo={true}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? '编辑角色' : '添加角色'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              placeholder="角色ID (唯一标识)"
              value={roleForm.role_id}
              onChange={(e) => setRoleForm({ ...roleForm, role_id: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="名称"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="描述"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <textarea
              placeholder="人格设定"
              value={roleForm.personality}
              onChange={(e) => setRoleForm({ ...roleForm, personality: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm min-h-[100px]"
            />
            <select
              value={roleForm.scope}
              onChange={(e) => setRoleForm({ ...roleForm, scope: e.target.value as any })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="system">系统</option>
              <option value="user">用户</option>
              <option value="project">项目</option>
            </select>
          </div>
          <DialogFooter>
            <button onClick={() => setRoleDialogOpen(false)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
            <button onClick={handleRoleSubmit} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              {editingRole ? '保存' : '添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSkill ? '编辑技能' : '添加技能'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <input
              placeholder="技能标识 (name)"
              value={skillForm.name}
              onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="标题"
              value={skillForm.title}
              onChange={(e) => setSkillForm({ ...skillForm, title: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="描述"
              value={skillForm.description}
              onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              value={skillForm.type}
              onChange={(e) => setSkillForm({ ...skillForm, type: e.target.value as PromptSkillType })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {SKILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <textarea
              placeholder="Markdown 格式的内容"
              value={skillForm.content}
              onChange={(e) => setSkillForm({ ...skillForm, content: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm min-h-[150px] font-mono"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setSkillDialogOpen(false)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
            <button onClick={handleSkillSubmit} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              {editingSkill ? '保存' : '添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bind Skill Dialog */}
      <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>绑定技能</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {/* 技能选择器 */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">选择技能</label>
              <div className="relative">
                <button
                  onClick={() => setSkillSearchOpen(true)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-muted/50"
                >
                  <span className={selectedSkill ? '' : 'text-muted-foreground'}>
                    {selectedSkill ? (
                      <span>
                        {selectedSkill.title}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({SKILL_TYPES.find(t => t.value === selectedSkill.type)?.label})
                        </span>
                      </span>
                    ) : '点击选择技能...'}
                  </span>
                  <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </button>

                {/* Command 弹窗 */}
                <Dialog open={skillSearchOpen} onOpenChange={setSkillSearchOpen}>
                  <DialogContent className="max-w-md p-0">
                    <Command className="rounded-lg border">
                      <CommandInput placeholder="搜索技能..." />
                      <CommandList className="max-h-[400px]">
                        <CommandEmpty>未找到技能</CommandEmpty>
                        {SKILL_TYPES.map(type => {
                          const skillsOfType = groupedAvailableSkills[type.value] || [];
                          if (skillsOfType.length === 0) return null;

                          return (
                            <CommandGroup key={type.value} heading={type.label}>
                              {skillsOfType.map(skill => (
                                <CommandItem
                                  key={skill.id}
                                  value={`${skill.title} ${skill.name}`}
                                  onSelect={() => {
                                    setBindForm({ ...bindForm, skill_id: skill.id });
                                    setSkillSearchOpen(false);
                                  }}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{skill.title}</div>
                                    <div className="text-xs text-muted-foreground">{skill.name}</div>
                                    {skill.description && (
                                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                        {skill.description}
                                      </div>
                                    )}
                                  </div>
                                  {bindForm.skill_id === skill.id && (
                                    <CheckIcon className="size-4 ml-2 shrink-0" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* 必需/可选选择 */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">技能类型</label>
              <select
                value={bindForm.ref_type}
                onChange={(e) => setBindForm({ ...bindForm, ref_type: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="required">必需</option>
                <option value="optional">可选</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setBindDialogOpen(false)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
            <button
              onClick={handleBindSubmit}
              disabled={!bindForm.skill_id}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              绑定
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除{deleteTarget?.type === 'role' ? '角色' : '技能'}
            <span className="font-medium text-foreground">「{deleteTarget?.name}」</span>吗？
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteTarget(null)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
            <button onClick={confirmDelete} className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white">删除</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptManagement;
