import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { PromptAnalysisDialog } from '@/components/PromptAnalysisDialog';
import { useLlmManagementData } from './llm-management/useLlmManagementData';
import { ProviderCard } from './llm-management/ProviderCard';
import { ModelCard } from './llm-management/ModelCard';
import { BindingCard } from './llm-management/BindingCard';
import { DeleteConfirmDialog } from './llm-management/DeleteConfirmDialog';
import { DELETE_TYPE_LABELS } from './llm-management/types';

const LlmManagement: React.FC = () => {
  const _navigate = useNavigate();
  const [promptAnalysisOpen, setPromptAnalysisOpen] = useState(false);

  const {
    providers,
    models,
    bindings,
    loading,
    loadData,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    bindingPage,
    bindingPageSize,
    setBindingPage
  } = useLlmManagementData();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid h-full gap-4 lg:grid-cols-4">
        <ProviderCard
          providers={providers}
          loadData={loadData}
          onRequestDelete={setDeleteTarget}
        />
        <ModelCard
          models={models}
          loadData={loadData}
          onRequestDelete={setDeleteTarget}
        />
        <BindingCard
          bindings={bindings}
          models={models}
          providers={providers}
          loadData={loadData}
          onRequestDelete={setDeleteTarget}
          onPromptAnalysis={() => setPromptAnalysisOpen(true)}
          bindingPage={bindingPage}
          bindingPageSize={bindingPageSize}
          setBindingPage={setBindingPage}
        />
      </div>

      <DeleteConfirmDialog
        target={deleteTarget}
        labels={DELETE_TYPE_LABELS}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <PromptAnalysisDialog
        open={promptAnalysisOpen}
        onOpenChange={setPromptAnalysisOpen}
      />
    </div>
  );
};

export default LlmManagement;
