import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { SimplePagination } from '@sker/ui/components/ui/simple-pagination';
import { PlusIcon, TrashIcon, PencilIcon, WrenchIcon } from 'lucide-react';
import type { PromptSkillEntity } from '@sker/entities';
import { getSkillTypeLabel } from './utils';
import type { DeleteTarget } from './types';

interface SkillLibraryCardProps {
  skills: PromptSkillEntity[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onEdit: (skill: PromptSkillEntity) => void;
  onRequestDelete: (target: DeleteTarget) => void;
}

export const SkillLibraryCard: React.FC<SkillLibraryCardProps> = ({
  skills,
  totalPages,
  currentPage,
  onPageChange,
  onAdd,
  onEdit,
  onRequestDelete,
}) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <WrenchIcon className="size-4" />
          技能库
        </CardTitle>
        <button
          onClick={onAdd}
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
              {skills.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-muted-foreground">{s.name}</div>
                  </td>
                  <td className="px-4 py-2">{getSkillTypeLabel(s.type)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(s)} className="mr-1 text-muted-foreground hover:text-foreground">
                      <PencilIcon className="size-3" />
                    </button>
                    <button
                      onClick={() => onRequestDelete({ type: 'skill', id: s.id, name: s.title })}
                      className="text-red-500 hover:text-red-600"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-2 border-t bg-muted/20">
            <SimplePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              showInfo={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
