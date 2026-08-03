import { useState } from 'react';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import { createLogger } from '@sker/core';
import { root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import type { EventItem } from '@/types';
import type { EditEventDialogApi } from './types';

const logger = createLogger('EventAnalysis');

/**
 * 编辑事件弹窗的状态与逻辑。
 * @param setEvents 更新事件列表，保存成功后就地更新对应事件
 */
export const useEditEventDialog = (
  setEvents: Dispatch<SetStateAction<EventItem[]>>,
): EditEventDialogApi => {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingKeywords, setEditingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [editingOccurredAt, setEditingOccurredAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openEditDialog = (event: EventItem, e: MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setEditingKeywords(event.keywords || []);
    setKeywordInput('');
    setEditingOccurredAt(event.occurredAt ? new Date(event.occurredAt) : null);
  };

  const closeEditDialog = () => {
    setEditingEventId(null);
    setEditingKeywords([]);
    setKeywordInput('');
    setEditingOccurredAt(null);
  };

  const saveChanges = async () => {
    if (!editingEventId) return;
    setIsSaving(true);
    try {
      const c = root.get(EventsController);
      // 并发更新关键词和时间
      await Promise.all([
        c.updateEventKeywords(editingEventId, { keywords: editingKeywords }),
        c.updateEventOccurredAt(editingEventId, { occurredAt: editingOccurredAt?.toISOString() || null }),
      ]);
      setEvents((prev) => prev.map((e) =>
        e.id === editingEventId
          ? { ...e, keywords: editingKeywords, occurredAt: editingOccurredAt?.toISOString() || null }
          : e,
      ));
      closeEditDialog();
    } catch (error) {
      logger.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    editingEventId,
    editingKeywords,
    keywordInput,
    editingOccurredAt,
    isSaving,
    openEditDialog,
    closeEditDialog,
    setEditingKeywords,
    setKeywordInput,
    setEditingOccurredAt,
    saveChanges,
  };
};
