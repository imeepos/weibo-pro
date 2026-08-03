import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@sker/ui/components/ui/dialog';
import type { RoleForm } from './types';

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RoleForm;
  onFormChange: (form: RoleForm) => void;
  editingRole: string | null;
  onSubmit: () => void;
}

export const RoleDialog: React.FC<RoleDialogProps> = ({ open, onOpenChange, form, onFormChange, editingRole, onSubmit }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingRole ? '编辑角色' : '添加角色'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <input
            placeholder="角色ID (唯一标识)"
            value={form.role_id}
            onChange={(e) => onFormChange({ ...form, role_id: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="名称"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="描述"
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="人格设定"
            value={form.personality}
            onChange={(e) => onFormChange({ ...form, personality: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm min-h-[100px]"
          />
          <select
            value={form.scope}
            onChange={(e) => onFormChange({ ...form, scope: e.target.value as RoleForm['scope'] })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="system">系统</option>
            <option value="user">用户</option>
            <option value="project">项目</option>
          </select>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
          <button onClick={onSubmit} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            {editingRole ? '保存' : '添加'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
