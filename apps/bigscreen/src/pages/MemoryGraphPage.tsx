import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Users, ChevronDown, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MemoryGraph from '../components/charts/MemoryGraph';
import { PersonaAPI } from '../services/api/persona';
import type { PersonaListItem, PersonaMemoryGraph, MemoryType } from '@sker/sdk';

const MEMORY_TYPE_LEGEND: { type: MemoryType; label: string; color: string }[] = [
  { type: 'fact', label: '事实', color: 'bg-blue-400' },
  { type: 'concept', label: '概念', color: 'bg-purple-400' },
  { type: 'event', label: '事件', color: 'bg-amber-400' },
  { type: 'person', label: '人物', color: 'bg-rose-400' },
  { type: 'insight', label: '洞察', color: 'bg-emerald-400' },
];

const MemoryGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<PersonaListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<PersonaMemoryGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    PersonaAPI.getList().then(setPersonas).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    PersonaAPI.getMemoryGraph(selectedId)
      .then(setGraphData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selectedPersona = personas.find(p => p.id === selectedId);

  return (
    <div className="h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl rounded-full" />

      <div className="relative z-10 px-6 py-4 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            {/* 返回按钮 */}
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-muted/20 transition-all duration-300 group"
              title="返回首页"
            >
              <Home className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <Brain className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">记忆图谱</h1>
              </div>
              <p className="text-muted-foreground text-sm">角色记忆关系可视化</p>
            </div>
          </div>
          {graphData && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xl font-bold text-primary">{graphData.memories.length}</div>
                <div className="text-xs text-muted-foreground">记忆节点</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-500">{graphData.relations.length}</div>
                <div className="text-xs text-muted-foreground">关系连接</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {graphData && !loading && (
          <div className="absolute inset-0">
            <MemoryGraph data={graphData} />
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-lg text-muted-foreground">加载记忆图谱...</div>
            </div>
          </div>
        )}

        {!selectedId && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <div className="text-lg text-muted-foreground">选择一个角色查看其记忆图谱</div>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-6 w-64"
        >
          <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-hidden">
            <button
              onClick={() => setListOpen(!listOpen)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">
                {selectedPersona?.name || '选择角色'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
            </button>
            {listOpen && (
              <div className="border-t border-border max-h-64 overflow-y-auto">
                {personas.map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => { setSelectedId(persona.id); setListOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                      persona.id === selectedId ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium">
                      {persona.avatar ? (
                        <img src={persona.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        persona.name[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{persona.name}</div>
                      <div className="text-xs text-muted-foreground">{persona.memoryCount} 条记忆</div>
                    </div>
                  </button>
                ))}
                {personas.length === 0 && (
                  <div className="px-4 py-6 text-center text-muted-foreground text-sm">暂无角色</div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-6 left-6"
        >
          <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-3">
            <div className="text-xs text-muted-foreground mb-2">记忆类型</div>
            <div className="flex flex-wrap gap-2">
              {MEMORY_TYPE_LEGEND.map(({ type, label, color }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${color}`} />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MemoryGraphPage;
