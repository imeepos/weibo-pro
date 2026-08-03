'use client';

import * as React from 'react';

import { PopoverAnchor } from '@radix-ui/react-popover';
import { TablePlugin, useTableMergeState } from '@platejs/table/react';
import type { TTableElement } from 'platejs';
import {
  useEditorPlugin,
  useEditorSelector,
  useElement,
  useFocusedLast,
  useRemoveNodeButton,
  useSelected,
} from 'platejs/react';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Combine,
  Grid2X2,
  PaintBucket,
  SquareSplitHorizontal,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@sker/ui/components/ui/dropdown-menu';
import { Popover, PopoverContent } from '@sker/ui/components/ui/popover';

import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
} from '../toolbar';
import {
  TableBordersDropdownMenuContent,
} from './table-borders-dropdown-menu';
import { ColorDropdownMenu } from './table-color-dropdown-menu';

export function TableFloatingToolbar({
  children,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  const { tf } = useEditorPlugin(TablePlugin);
  const selected = useSelected();
  const element = useElement<TTableElement>();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const collapsedInside = useEditorSelector(
    (editor) => selected && editor.api.isCollapsed(),
    [selected]
  );
  const isFocusedLast = useFocusedLast();

  const { canMerge, canSplit } = useTableMergeState();

  return (
    <Popover
      open={isFocusedLast && (canMerge || canSplit || collapsedInside)}
      modal={false}
    >
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        asChild
        onOpenAutoFocus={(e) => e.preventDefault()}
        contentEditable={false}
        {...props}
      >
        <Toolbar
          className="scrollbar-hide flex w-auto max-w-[80vw] flex-row overflow-x-auto rounded-md border bg-popover p-1 shadow-md print:hidden"
          contentEditable={false}
        >
          <ToolbarGroup>
            <ColorDropdownMenu tooltip="Background color">
              <PaintBucket />
            </ColorDropdownMenu>
            {canMerge && (
              <ToolbarButton
                onClick={() => tf.table.merge()}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Merge cells"
              >
                <Combine />
              </ToolbarButton>
            )}
            {canSplit && (
              <ToolbarButton
                onClick={() => tf.table.split()}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Split cell"
              >
                <SquareSplitHorizontal />
              </ToolbarButton>
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <ToolbarButton tooltip="Cell borders">
                  <Grid2X2 />
                </ToolbarButton>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <TableBordersDropdownMenuContent />
              </DropdownMenuPortal>
            </DropdownMenu>

            {collapsedInside && (
              <ToolbarGroup>
                <ToolbarButton tooltip="Delete table" {...buttonProps}>
                  <Trash2Icon />
                </ToolbarButton>
              </ToolbarGroup>
            )}
          </ToolbarGroup>

          {collapsedInside && (
            <RowInsertionGroup
              onBefore={() => tf.insert.tableRow({ before: true })}
              onAfter={() => tf.insert.tableRow()}
              onRemove={() => tf.remove.tableRow()}
            />
          )}

          {collapsedInside && (
            <ColumnInsertionGroup
              onBefore={() => tf.insert.tableColumn({ before: true })}
              onAfter={() => tf.insert.tableColumn()}
              onRemove={() => tf.remove.tableColumn()}
            />
          )}
        </Toolbar>
      </PopoverContent>
    </Popover>
  );
}

function RowInsertionGroup({
  onBefore,
  onAfter,
  onRemove,
}: {
  onBefore: () => void;
  onAfter: () => void;
  onRemove: () => void;
}) {
  return (
    <ToolbarGroup>
      <ToolbarButton
        onClick={onBefore}
        onMouseDown={(e) => e.preventDefault()}
        tooltip="Insert row before"
      >
        <ArrowUp />
      </ToolbarButton>
      <ToolbarButton
        onClick={onAfter}
        onMouseDown={(e) => e.preventDefault()}
        tooltip="Insert row after"
      >
        <ArrowDown />
      </ToolbarButton>
      <ToolbarButton
        onClick={onRemove}
        onMouseDown={(e) => e.preventDefault()}
        tooltip="Delete row"
      >
        <XIcon />
      </ToolbarButton>
    </ToolbarGroup>
  );
}

function ColumnInsertionGroup({
  onBefore,
  onAfter,
  onRemove,
}: {
  onBefore: () => void;
  onAfter: () => void;
  onRemove: () => void;
}) {
  return (
    <ToolbarGroup>
      <ToolbarButton
        onClick={onBefore}
        onMouseDown={(e) => e.preventDefault()}
        tooltip="Insert column before"
      >
        <ArrowLeft />
      </ToolbarButton>
      <ToolbarButton
        onClick={onAfter}
        onMouseDown={(e) => e.preventDefault()}
        tooltip="Insert column after"
      >
        <ArrowRight />
      </ToolbarButton>
      <ToolbarButton
        onClick={onRemove}
        onMouseDown={(e) => e.preventDefault()}
        tooltip="Delete column"
      >
        <XIcon />
      </ToolbarButton>
    </ToolbarGroup>
  );
}
