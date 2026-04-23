import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { UserDetectionHeader } from '@/components/common/UserDetectionHeader';
import { useInvestigationQueue } from '@/hooks/useInvestigationQueue';
import { useUserDossier } from '@/hooks/useUserDossier';
import { useDistillationTasks } from '@/hooks/useDistillationTasks';
import { InvestigationQueuePanel } from '@/components/user-investigation/InvestigationQueuePanel';
import { UserDossierPanel } from '@/components/user-investigation/UserDossierPanel';
import { DistillationWorkspacePanel } from '@/components/user-investigation/DistillationWorkspacePanel';
import { PersonaNetworkPanel } from '@/components/user-investigation/PersonaNetworkPanel';

const UserDetection: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [mode, setMode] = useState<'investigation' | 'graph'>('investigation');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const riskLevelLabels = useMemo<Record<string, string>>(
    () => ({
      all: '全部',
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      critical: '极高风险',
    }),
    [],
  );

  const riskLevels = useMemo(() => Object.keys(riskLevelLabels), [riskLevelLabels]);

  const {
    queue,
    isLoading: queueLoading,
    error: queueError,
  } = useInvestigationQueue({
    riskLevel: selectedRiskLevel === 'all' ? undefined : selectedRiskLevel,
    page: 1,
    pageSize: 20,
  });

  const filteredQueue = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return queue;
    return queue.filter((item) => item.screenName.toLowerCase().includes(search));
  }, [queue, searchTerm]);

  const dossierState = useUserDossier({
    userId: selectedUserId,
    windowDays: 90,
  });

  const tasksState = useDistillationTasks({
    userId: selectedUserId,
  });

  const content = mode === 'graph' ? (
    <PersonaNetworkPanel onBackToInvestigation={() => setMode('investigation')} />
  ) : (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(420px,1.4fr)_minmax(320px,1fr)]">
      <InvestigationQueuePanel
        queue={filteredQueue}
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
      />
      <UserDossierPanel dossier={dossierState.dossier} />
      <DistillationWorkspacePanel
        selectedUserId={selectedUserId}
        tasks={tasksState.tasks}
        onCreateTask={() => {
          void tasksState.createTask({ historyWindowDays: 90 });
        }}
        onOpenGraphMode={() => setMode('graph')}
      />
    </div>
  );

  return (
    <div className="space-y-6 px-4 py-4">
      <UserDetectionHeader
        selectedTimeRange={selectedTimeRange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedRiskLevel={selectedRiskLevel}
        onRiskLevelChange={setSelectedRiskLevel}
        riskLevels={riskLevels}
        riskLevelLabels={riskLevelLabels}
      />

      {queueError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          高危候选队列加载失败：{queueError.message}
        </div>
      )}

      {!queueError && queueLoading && mode === 'investigation' ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          正在加载调查工作台...
        </div>
      ) : (
        content
      )}
    </div>
  );
};

export default UserDetection;
