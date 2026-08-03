import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { PlusIcon, TrashIcon, LinkIcon } from 'lucide-react';
import type { PromptRoleWithSkills } from '@sker/sdk';
import { getSkillTypeLabel } from './utils';

interface RoleSkillBindingCardProps {
  currentRole: PromptRoleWithSkills | undefined;
  onBind: (roleId: string) => void;
  onUnbind: (roleId: string, skillId: string) => void;
}

export const RoleSkillBindingCard: React.FC<RoleSkillBindingCardProps> = ({ currentRole, onBind, onUnbind }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LinkIcon className="size-4" />
          {currentRole ? `${currentRole.name} 的技能` : '选择角色查看技能'}
        </CardTitle>
        {currentRole && (
          <button
            onClick={() => onBind(currentRole.id)}
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
                  <td className="px-4 py-2">{getSkillTypeLabel(ref.skill_type)}</td>
                  <td className="px-4 py-2">{ref.ref_type === 'required' ? '是' : '否'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => onUnbind(currentRole.id, ref.skill_id)}
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
  );
};
