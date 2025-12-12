import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';

const PromptRoleSkillRender: React.FC<{ ast: PromptRoleSkillAst }> = ({ ast }) => {
  if (ast.state === 'pending') {
    return (
      <div className="p-3 text-center text-slate-400 text-sm">
        指定角色后运行
      </div>
    );
  }

  const selectedSkills = ast.selectedSkillsList?.getValue() || [];

  return (
    <div className="space-y-3 p-3 max-w-sm">
      {ast.availableSkills.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            可用技能
          </div>
          <div className="flex flex-wrap gap-1">
            {ast.availableSkills.map((skill) => (
              <span
                key={skill.id}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                  selectedSkills.some(s => s.id === skill.id)
                    ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-700/30 text-slate-400 border-slate-600/50'
                }`}
              >
                {skill.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedSkills.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-700">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            选中的技能
          </div>
          <div className="space-y-1.5">
            {selectedSkills.map((skill) => (
              <div key={skill.id} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-emerald-300">{skill.title}</div>
                    {skill.description && (
                      <div className="text-[10px] text-emerald-400/70 line-clamp-2">
                        {skill.description}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-slate-700/50 text-slate-400">
                    {skill.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ast.state === 'success' && selectedSkills.length === 0 && ast.availableSkills.length > 0 && (
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="text-xs text-yellow-300">
            未选择任何技能
          </div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class PromptRoleSkillAstRender {
  @Render(PromptRoleSkillAst)
  render(ast: PromptRoleSkillAst) {
    return <PromptRoleSkillRender ast={ast} />;
  }
}
