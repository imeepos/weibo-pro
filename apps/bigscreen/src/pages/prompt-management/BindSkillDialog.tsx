import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@sker/ui/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@sker/ui/components/ui/command';
import { CheckIcon } from 'lucide-react';
import type { PromptSkillEntity, PromptSkillType } from '@sker/entities';
import { SKILL_TYPES } from './constants';
import { getSkillTypeLabel } from './utils';
import type { BindForm } from './types';

interface BindSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindForm: BindForm;
  onFormChange: (form: BindForm) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  groupedAvailableSkills: Record<PromptSkillType, PromptSkillEntity[]>;
  selectedSkill: PromptSkillEntity | undefined;
  onSubmit: () => void;
}

export const BindSkillDialog: React.FC<BindSkillDialogProps> = ({
  open,
  onOpenChange,
  bindForm,
  onFormChange,
  searchOpen,
  onSearchOpenChange,
  groupedAvailableSkills,
  selectedSkill,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onClick={() => onSearchOpenChange(true)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-muted/50"
              >
                <span className={selectedSkill ? '' : 'text-muted-foreground'}>
                  {selectedSkill ? (
                    <span>
                      {selectedSkill.title}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({getSkillTypeLabel(selectedSkill.type)})
                      </span>
                    </span>
                  ) : '点击选择技能...'}
                </span>
                <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </button>

              {/* Command 弹窗 */}
              <Dialog open={searchOpen} onOpenChange={onSearchOpenChange}>
                <DialogContent className="max-w-md p-0">
                  <Command className="rounded-lg border">
                    <CommandInput placeholder="搜索技能..." />
                    <CommandList className="max-h-[400px]">
                      <CommandEmpty>未找到技能</CommandEmpty>
                      {SKILL_TYPES.map((type) => {
                        const skillsOfType = groupedAvailableSkills[type.value] || [];
                        if (skillsOfType.length === 0) return null;

                        return (
                          <CommandGroup key={type.value} heading={type.label}>
                            {skillsOfType.map((skill) => (
                              <CommandItem
                                key={skill.id}
                                value={`${skill.title} ${skill.name}`}
                                onSelect={() => {
                                  onFormChange({ ...bindForm, skill_id: skill.id });
                                  onSearchOpenChange(false);
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
              onChange={(e) => onFormChange({ ...bindForm, ref_type: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="required">必需</option>
              <option value="optional">可选</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-md bg-muted px-3 py-1.5 text-sm">取消</button>
          <button
            onClick={onSubmit}
            disabled={!bindForm.skill_id}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            绑定
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
