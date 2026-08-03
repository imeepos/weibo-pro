import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { LayoutArea } from '../../../stores/useLayoutStore';

export interface UseLayoutHistoryResult {
  areas: LayoutArea[];
  setAreas: Dispatch<SetStateAction<LayoutArea[]>>;
  history: LayoutArea[][];
  historyIndex: number;
  addToHistory: (newAreas: LayoutArea[]) => void;
  undo: () => void;
  redo: () => void;
}

export function useLayoutHistory(initialAreas: LayoutArea[]): UseLayoutHistoryResult {
  const [areas, setAreas] = useState<LayoutArea[]>(initialAreas);
  const [history, setHistory] = useState<LayoutArea[][]>([initialAreas]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 添加到历史记录
  const addToHistory = useCallback((newAreas: LayoutArea[]) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push([...newAreas]);
      return newHistory;
    });
    setHistoryIndex(historyIndex + 1);
  }, [historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAreas([...history[historyIndex - 1]]);
    }
  }, [history, historyIndex]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAreas([...history[historyIndex + 1]]);
    }
  }, [history, historyIndex]);

  return {
    areas,
    setAreas,
    history,
    historyIndex,
    addToHistory,
    undo,
    redo
  };
}
