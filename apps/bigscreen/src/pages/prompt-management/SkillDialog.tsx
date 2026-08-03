import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@sker/ui/components/ui/dialog';
import { SKILL_TYPES } from './constants';
import type { SkillForm } from './types';

interface SkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: SkillForm;
  onFormChange: (form: SkillForm) => void;
  editingSkill: string | null;
  onSubmit: () => void;
}

export const SkillDialog: React.FC<SkillDialogProps> = ({ open, onOpenChange, form, onFormChange, editingSkill, onSubmit }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingSkill ? '编辑技能' : '添加技能'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <input
            placeholder="技能标识 (name)"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="标题"
            value={form.title}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="描述"
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => onFormChange({ ...form, type: e.target.value as SkillForm['type'] })}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            {SKILL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <textarea
            placeholder="Markdown 格式的内容"
            value={form.content}
            onChange={(e) => onFormChange({ ...form, content: e.target.value })}
            className="rounded-md border bg-background px-3 py-2 text-sm min-h-[150px] font-mono"
          />
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
          <button onClick={onSubmit} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            {editingSkill ? '保存' : '添加'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
