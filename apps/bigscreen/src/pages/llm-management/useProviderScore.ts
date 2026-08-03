import { useState } from 'react';
import { root } from '@sker/core';
import { LlmProvidersController } from '@sker/sdk';
import type { LlmProvider } from '@sker/entities';

/**
 * 提供商健康分的编辑与增减逻辑。
 */
export function useProviderScore({
  loadData,
  providers
}: {
  loadData: () => void;
  providers: LlmProvider[];
}) {
  const providersCtrl = root.get(LlmProvidersController);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number>(0);

  const handleEditScore = (provider: LlmProvider) => {
    setEditingProvider(provider.id);
    setEditingValue(provider.score);
  };

  const handleSaveScore = async () => {
    if (!editingProvider) return;
    await providersCtrl.updateScore(editingProvider, editingValue);
    setEditingProvider(null);
    loadData();
  };

  const handleResetScore = async (id: string) => {
    await providersCtrl.updateScore(id, 1000000);
    loadData();
  };

  const handleIncreaseScore = async (id: string, amount = 1000) => {
    const provider = providers.find((p) => p.id === id);
    if (provider) {
      const newScore = Math.min(1000000, provider.score + amount);
      await providersCtrl.updateScore(id, newScore);
      loadData();
    }
  };

  const handleDecreaseScore = async (id: string, amount = 1000) => {
    const provider = providers.find((p) => p.id === id);
    if (provider) {
      const newScore = Math.max(0, provider.score - amount);
      await providersCtrl.updateScore(id, newScore);
      loadData();
    }
  };

  return {
    editingProvider,
    editingValue,
    setEditingProvider,
    setEditingValue,
    handleEditScore,
    handleSaveScore,
    handleResetScore,
    handleIncreaseScore,
    handleDecreaseScore
  };
}
