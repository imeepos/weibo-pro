import React, { useState, useEffect } from 'react';
import { Injectable, root } from '@sker/core';
import { Render, Setting } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { PromptRolesController, type PromptRoleWithSkills } from '@sker/sdk';
import type { PromptSkillType } from '@sker/entities';

const SkillTypeColors: Record<PromptSkillType, string> = {
  thought: 'bg-blue-500/20 text-blue-400',
  execution: 'bg-green-500/20 text-green-400',
  knowledge: 'bg-purple-500/20 text-purple-400',
  decision: 'bg-orange-500/20 text-orange-400',
};

const SkillItem: React.FC<{
  title: string;
  description: string | null;
  type: PromptSkillType;
  isSelected: boolean;
}> = ({ title, description, type, isSelected }) => (
  <div className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
    isSelected
      ? 'bg-accent/50 border-border'
      : 'bg-muted/50 border-border'
  }`}>
    <span className={`px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap ${SkillTypeColors[type] || 'bg-muted text-muted-foreground'}`}>
      {type}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-foreground truncate">{title}</div>
      {description && (
        <div className="text-[10px] text-muted-foreground line-clamp-2">{description}</div>
      )}
    </div>
    {isSelected && (
      <span className="text-[10px] text-accent-foreground">✓</span>
    )}
  </div>
);

const PromptRoleSkillRender: React.FC<{ ast: PromptRoleSkillAst }> = ({ ast }) => {
  if (!ast.roleId) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        请在属性面板中选择角色
      </div>
    );
  }

  const selectedSkills = ast.selectedSkillsList?.getValue() || [];
  const availableSkills = ast.availableSkills || [];

  return (
    <div className="space-y-3 p-3 max-w-sm">
      {/* 可用技能 */}
      {availableSkills.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            可用技能 ({availableSkills.length})
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {availableSkills.map((skill) => (
              <SkillItem
                key={skill.id}
                title={skill.title}
                description={skill.description}
                type={skill.type}
                isSelected={selectedSkills.some(s => s.id === skill.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 选中的技能 */}
      {selectedSkills.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            选中的技能 ({selectedSkills.length})
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {selectedSkills.map((skill) => (
              <SkillItem
                key={skill.id}
                title={skill.title}
                description={skill.description}
                type={skill.type}
                isSelected={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* 无选择提示 */}
      {ast.state === 'success' && selectedSkills.length === 0 && availableSkills.length > 0 && (
        <div className="p-2 rounded-lg bg-muted/50 border border-border">
          <div className="text-xs text-muted-foreground">
            未选择任何技能
          </div>
        </div>
      )}
    </div>
  );
};

interface RoleSettingProps {
  ast: PromptRoleSkillAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const RoleSetting: React.FC<RoleSettingProps> = ({ ast, onPropertyChange }) => {
  const [roles, setRoles] = useState<PromptRoleWithSkills[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = root.get(PromptRolesController);
    controller.findAll().then((list) => {
      setRoles(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = (roleId: string) => {
    onPropertyChange?.('roleId', roleId);
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>;
  }

  const selectedRole = roles.find(r => r.id === ast.roleId);
  const filteredRoles = search
    ? roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))
    : roles;

  return (
    <div className="space-y-3 p-3">
      {/* 搜索框 */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索角色..."
        className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {/* 当前选择 */}
      {selectedRole && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            当前角色
          </div>
          <div className="p-2 rounded-lg bg-accent/50 border border-border">
            <div className="text-xs font-medium text-foreground">{selectedRole.name}</div>
            {selectedRole.description && (
              <div className="text-[10px] text-muted-foreground line-clamp-2">
                {selectedRole.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 角色列表 */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          选择角色 ({filteredRoles.length})
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filteredRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelect(role.id)}
              className={`w-full text-left p-2 rounded-lg border transition-all ${
                ast.roleId === role.id
                  ? 'bg-accent/50 border-border'
                  : 'bg-muted/50 border-border hover:bg-muted'
              }`}
            >
              <div className="text-xs font-medium text-foreground">{role.name}</div>
              {role.description && (
                <div className="text-[10px] text-muted-foreground line-clamp-1">
                  {role.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

@Injectable()
export class PromptRoleSkillAstRender {
  @Render(PromptRoleSkillAst)
  render(ast: PromptRoleSkillAst) {
    return <PromptRoleSkillRender ast={ast} />;
  }

  @Setting(PromptRoleSkillAst)
  setting(ast: PromptRoleSkillAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <RoleSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }
}
