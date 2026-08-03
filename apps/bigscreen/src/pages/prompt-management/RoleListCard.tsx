import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { PlusIcon, TrashIcon, PencilIcon, UserIcon } from 'lucide-react';
import type { PromptRoleWithSkills } from '@sker/sdk';
import type { DeleteTarget } from './types';

interface RoleListCardProps {
  roles: PromptRoleWithSkills[];
  selectedRole: string | null;
  onSelectRole: (id: string) => void;
  onAdd: () => void;
  onEdit: (role: PromptRoleWithSkills) => void;
  onRequestDelete: (target: DeleteTarget) => void;
}

export const RoleListCard: React.FC<RoleListCardProps> = ({
  roles,
  selectedRole,
  onSelectRole,
  onAdd,
  onEdit,
  onRequestDelete,
}) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserIcon className="size-4" />
          角色
        </CardTitle>
        <button
          onClick={onAdd}
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
              onClick={() => onSelectRole(r.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role_id}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <PencilIcon className="size-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRequestDelete({ type: 'role', id: r.id, name: r.name }); }}
                    className="text-red-500 hover:text-red-600"
                  >
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
  );
};
