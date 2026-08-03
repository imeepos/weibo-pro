'use client';

import { useDropLine } from '@platejs/dnd';
import { cn } from '@sker/ui/lib/utils';

export function DropLine() {
  const { dropLine } = useDropLine({ orientation: 'horizontal' });

  if (!dropLine) return null;

  return (
    <div
      className={cn(
        'slate-dropLine',
        'absolute bg-brand/50',
        dropLine === 'left' &&
        'group-first/column:-left-1 inset-y-0 left-[-10.5px] w-1',
        dropLine === 'right' &&
        'group-last/column:-right-1 inset-y-0 right-[-11px] w-1'
      )}
    />
  );
}
