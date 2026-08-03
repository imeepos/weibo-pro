import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sker/ui/components/ui/dialog';
import type { DeleteTarget, DeleteType } from './types';

interface DeleteConfirmDialogProps {
  target: DeleteTarget;
  labels: Record<DeleteType, string>;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ target, labels, onClose, onConfirm }) => {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          确定要删除{target && labels[target.type]}
          {target?.name && <span className="font-medium text-foreground">「{target.name}」</span>}吗？
        </p>
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-md bg-muted px-3 py-1.5 text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white"
          >
            删除
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
