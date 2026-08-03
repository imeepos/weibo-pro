import React from 'react';
import { Button } from '@sker/ui/components/ui/button';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { DatePicker } from '@sker/ui/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sker/ui/components/ui/dialog';
import type { EditEventDialogApi } from './types';

export interface EditEventDialogProps {
  editDialog: EditEventDialogApi;
}

/** 编辑事件弹窗：调整关键词与事件发生时间 */
export const EditEventDialog: React.FC<EditEventDialogProps> = ({ editDialog }) => {
  const {
    editingKeywords,
    keywordInput,
    editingOccurredAt,
    isSaving,
    closeEditDialog,
    setEditingKeywords,
    setKeywordInput,
    setEditingOccurredAt,
    saveChanges,
  } = editDialog;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) closeEditDialog();
      }}
    >
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>编辑事件</DialogTitle>
          <DialogDescription>调整事件的关键字和发生时间</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 关键词编辑 */}
          <div className="space-y-2">
            <Label>关键词</Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-muted/30 rounded-lg">
              {editingKeywords.length > 0 ? (
                editingKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-primary/15 text-primary text-sm rounded-full flex items-center gap-1 group"
                  >
                    #{keyword}
                    <button
                      onClick={() => {
                        setEditingKeywords(editingKeywords.filter((k) => k !== keyword));
                      }}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂无关键字</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="输入新关键字"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && keywordInput.trim()) {
                    setEditingKeywords([...editingKeywords, keywordInput.trim()]);
                    setKeywordInput('');
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (keywordInput.trim()) {
                    setEditingKeywords([...editingKeywords, keywordInput.trim()]);
                    setKeywordInput('');
                  }
                }}
                disabled={!keywordInput.trim()}
              >
                添加
              </Button>
            </div>
          </div>

          {/* 事件发生时间 */}
          <div className="space-y-2">
            <Label>事件发生时间</Label>
            <DatePicker
              date={editingOccurredAt}
              onSelect={(date) => setEditingOccurredAt(date)}
              placeholder="选择事件发生时间"
            />
            <p className="text-xs text-muted-foreground">
              设置事件的最初发生时间，用于事件溯源和分析
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeEditDialog}>取消</Button>
          <Button onClick={saveChanges} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
