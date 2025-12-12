import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { PersonaCreatorAst } from '@sker/workflow-ast';

const PersonaCreatorRender: React.FC<{ ast: PersonaCreatorAst }> = ({ ast }) => {
  if (ast.state === 'pending') {
    return (
      <div className="p-3 text-center text-slate-400 text-sm">
        输入角色描述后运行
      </div>
    );
  }

  const personaId = ast.personaId?.getValue() || '';

  return (
    <div className="space-y-3 p-3 max-w-sm">
      {ast.generatedName && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50 border border-slate-600">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {ast.generatedName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200">{ast.generatedName}</div>
            {ast.generatedDescription && (
              <div className="text-[10px] text-slate-400 truncate">{ast.generatedDescription}</div>
            )}
          </div>
        </div>
      )}

      {ast.generatedTraits && ast.generatedTraits.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            性格特质
          </div>
          <div className="flex flex-wrap gap-1">
            {ast.generatedTraits.map((trait, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {ast.generatedBackground && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            背景故事
          </div>
          <div className="p-2 rounded-lg bg-slate-700/30 border border-slate-600/50">
            <div className="text-xs text-slate-300 line-clamp-4 whitespace-pre-wrap">
              {ast.generatedBackground}
            </div>
          </div>
        </div>
      )}

      {personaId && (
        <div className="pt-2 border-t border-slate-700">
          <div className="text-[10px] text-slate-500">
            ID: {personaId.slice(0, 8)}...
          </div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class PersonaCreatorAstRender {
  @Render(PersonaCreatorAst)
  render(ast: PersonaCreatorAst) {
    return <PersonaCreatorRender ast={ast} />;
  }
}
