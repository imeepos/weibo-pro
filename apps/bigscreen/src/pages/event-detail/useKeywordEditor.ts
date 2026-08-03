import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createLogger, root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import type { EventDetailData } from './types';

const logger = createLogger('EventDetail');

export type KeywordEditorReturn = {
  editingKeywords: string[];
  keywordInput: string;
  setKeywordInput: (value: string) => void;
  isSaving: boolean;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  openEditDialog: () => void;
  closeEditDialog: () => void;
  addKeyword: () => void;
  removeKeyword: (keyword: string) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  saveKeywords: () => Promise<void>;
};

export function useKeywordEditor(
  eventId: string | undefined,
  eventData: EventDetailData | null,
  onSaved: (keywords: string[]) => void,
) {
  const [editingKeywords, setEditingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const openEditDialog = () => {
    if (eventData) {
      setEditingKeywords([...eventData.keywords]);
      setKeywordInput('');
      setEditDialogOpen(true);
    }
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingKeywords([]);
    setKeywordInput('');
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !editingKeywords.includes(trimmed)) {
      setEditingKeywords([...editingKeywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setEditingKeywords(editingKeywords.filter(k => k !== keyword));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const saveKeywords = async () => {
    if (!eventId || !eventData) return;
    setIsSaving(true);
    try {
      const c = root.get(EventsController);
      await c.updateEventKeywords(eventId, { keywords: editingKeywords });
      onSaved(editingKeywords);
      closeEditDialog();
    } catch (error) {
      logger.error('Failed to update keywords:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    editingKeywords,
    keywordInput,
    setKeywordInput,
    isSaving,
    editDialogOpen,
    setEditDialogOpen,
    openEditDialog,
    closeEditDialog,
    addKeyword,
    removeKeyword,
    handleKeyDown,
    saveKeywords,
  };
}
