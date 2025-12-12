import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { PersonaAst, RetrievedMemory } from '@sker/workflow-ast';

const MemoryTypeColors: Record<string, string> = {
  fact: 'bg-blue-500/20 text-blue-400',
  concept: 'bg-purple-500/20 text-purple-400',
  event: 'bg-green-500/20 text-green-400',
  person: 'bg-orange-500/20 text-orange-400',
  insight: 'bg-pink-500/20 text-pink-400',
};

const MemoryItem: React.FC<{ memory: RetrievedMemory }> = ({ memory }) => (
  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-700/30 border border-slate-600/50">
    <span className={`px-1.5 py-0.5 text-[10px] rounded ${MemoryTypeColors[memory.type] || 'bg-slate-600 text-slate-300'}`}>
      {memory.type}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-slate-200 truncate">{memory.name}</div>
      <div className="text-[10px] text-slate-400 line-clamp-2">{memory.content}</div>
    </div>
    <span className="text-[10px] text-slate-500">D{memory.depth}</span>
  </div>
);

const PersonaRender: React.FC<{ ast: PersonaAst }> = ({ ast }) => {
  if (ast.state === 'pending') {
    if (!ast.personaId) {
      return (
        <div className="p-3 text-center text-slate-400 text-sm">
          请在属性面板中选择角色
        </div>
      );
    }
    return null;
  }

  const responseValue = ast.response?.getValue() || '';
  const memories = ast.retrievedMemories || [];

  return (
    <div className="space-y-3 p-3 max-w-sm">
      {/* 角色信息 */}
      {ast.personaName && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50 border border-slate-600">
          {ast.personaAvatar ? (
            <img
              src={ast.personaAvatar}
              alt={ast.personaName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-500"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {ast.personaName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-slate-200">{ast.personaName}</div>
            <div className="text-[10px] text-slate-400">
              检索 {memories.length} 条记忆
            </div>
          </div>
        </div>
      )}

      {/* 检索到的记忆 */}
      {memories.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            相关记忆
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {memories.slice(0, 5).map((m) => (
              <MemoryItem key={m.id} memory={m} />
            ))}
            {memories.length > 5 && (
              <div className="text-center text-[10px] text-slate-500">
                +{memories.length - 5} 更多
              </div>
            )}
          </div>
        </div>
      )}

      {/* 回复内容 */}
      {responseValue && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            角色回复
          </div>
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <div className="text-xs text-slate-200 line-clamp-4 whitespace-pre-wrap">
              {responseValue}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class PersonaAstRender {
  @Render(PersonaAst)
  render(ast: PersonaAst) {
    return <PersonaRender ast={ast} />;
  }
}
