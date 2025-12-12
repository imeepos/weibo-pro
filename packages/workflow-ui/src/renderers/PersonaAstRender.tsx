import React, { useState, useEffect } from 'react';
import { Injectable, root } from '@sker/core';
import { Render, Setting } from '@sker/workflow';
import { PersonaAst, RetrievedMemory } from '@sker/workflow-ast';
import { PersonaController } from '@sker/sdk';
import { PersonaSelector, type PersonaItem } from '@sker/ui/components/ui';

const MemoryTypeColors: Record<string, string> = {
  fact: 'bg-blue-500/20 text-blue-400',
  concept: 'bg-purple-500/20 text-purple-400',
  event: 'bg-green-500/20 text-green-400',
  person: 'bg-orange-500/20 text-orange-400',
  insight: 'bg-pink-500/20 text-pink-400',
};

const MemoryItem: React.FC<{ memory: RetrievedMemory }> = ({ memory }) => (
  <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border">
    <span className={`px-1.5 py-0.5 text-[10px] rounded ${MemoryTypeColors[memory.type] || 'bg-muted text-muted-foreground'}`}>
      {memory.type}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-foreground truncate">{memory.name}</div>
      <div className="text-[10px] text-muted-foreground line-clamp-2">{memory.content}</div>
    </div>
    <span className="text-[10px] text-muted-foreground">D{memory.depth}</span>
  </div>
);

const PersonaRender: React.FC<{ ast: PersonaAst }> = ({ ast }) => {
  // 未选择角色时提示
  if (!ast.personaId) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        请在属性面板中选择角色
      </div>
    );
  }

  const responseValue = ast.response?.getValue() || '';
  const memories = ast.retrievedMemories || [];

  return (
    <div className="space-y-3 p-3 max-w-sm">
      {/* 角色信息 */}
      {ast.personaName && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/50 border border-border">
          {ast.personaAvatar ? (
            <img
              src={ast.personaAvatar}
              alt={ast.personaName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {ast.personaName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-foreground">{ast.personaName}</div>
            <div className="text-[10px] text-muted-foreground">
              {memories.length > 0 ? `检索 ${memories.length} 条记忆` : '待执行'}
            </div>
          </div>
        </div>
      )}

      {/* 检索到的记忆 */}
      {memories.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            相关记忆
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {memories.slice(0, 5).map((m) => (
              <MemoryItem key={m.id} memory={m} />
            ))}
            {memories.length > 5 && (
              <div className="text-center text-[10px] text-muted-foreground">
                +{memories.length - 5} 更多
              </div>
            )}
          </div>
        </div>
      )}

      {/* 回复内容 */}
      {responseValue && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            角色回复
          </div>
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <div className="text-xs text-foreground line-clamp-4 whitespace-pre-wrap">
              {responseValue}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PersonaSettingProps {
  ast: PersonaAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const PersonaSetting: React.FC<PersonaSettingProps> = ({ ast, onPropertyChange }) => {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = root.get(PersonaController);
    controller.getPersonaList().then((list) => {
      setPersonas(list.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        description: p.description,
        memoryCount: p.memoryCount
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      onPropertyChange?.('personaId', persona.id);
      onPropertyChange?.('personaName', persona.name);
      onPropertyChange?.('personaAvatar', persona.avatar || undefined);
    } else {
      onPropertyChange?.('personaId', undefined);
      onPropertyChange?.('personaName', undefined);
      onPropertyChange?.('personaAvatar', undefined);
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>;
  }

  return (
    <PersonaSelector
      personas={personas}
      value={ast.personaId}
      onChange={handleSelect}
      placeholder="搜索角色..."
    />
  );
};

@Injectable()
export class PersonaAstRender {
  @Render(PersonaAst)
  render(ast: PersonaAst) {
    return <PersonaRender ast={ast} />;
  }

  @Setting(PersonaAst)
  setting(ast: PersonaAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <PersonaSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }
}
