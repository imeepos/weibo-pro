'use client';

import * as React from 'react';

import type { TColumnElement } from 'platejs';
import { setColumns } from '@platejs/layout';
import {
  useEditorRef,
  useEditorSelector,
  useElement,
  useFocusedLast,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
} from 'platejs/react';
import { Trash2Icon } from 'lucide-react';

import { Button } from '@sker/ui/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@sker/ui/components/ui/popover';
import { Separator } from '@sker/ui/components/ui/separator';
import {
  DoubleColumnOutlined,
  DoubleSideDoubleColumnOutlined,
  LeftSideDoubleColumnOutlined,
  RightSideDoubleColumnOutlined,
  ThreeColumnOutlined,
} from './column-layout-icons';

export function ColumnFloatingToolbar({ children }: React.PropsWithChildren) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const element = useElement<TColumnElement>();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const selected = useSelected();
  const isCollapsed = useEditorSelector(
    (editor) => editor.api.isCollapsed(),
    []
  );
  const isFocusedLast = useFocusedLast();

  const open = isFocusedLast && !readOnly && selected && isCollapsed;

  const onColumnChange = (widths: string[]) => {
    setColumns(editor, {
      at: element,
      widths,
    });
  };

  return (
    <Popover open={open} modal={false}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverContent
        className="w-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        align="center"
        side="top"
        sideOffset={10}
      >
        <div className="box-content flex h-8 items-center">
          <Button
            variant="ghost"
            className="size-8"
            onClick={() => onColumnChange(['50%', '50%'])}
          >
            <DoubleColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="size-8"
            onClick={() => onColumnChange(['33%', '33%', '33%'])}
          >
            <ThreeColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="size-8"
            onClick={() => onColumnChange(['70%', '30%'])}
          >
            <RightSideDoubleColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="size-8"
            onClick={() => onColumnChange(['30%', '70%'])}
          >
            <LeftSideDoubleColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="size-8"
            onClick={() => onColumnChange(['25%', '50%', '25%'])}
          >
            <DoubleSideDoubleColumnOutlined />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button variant="ghost" className="size-8" {...buttonProps}>
            <Trash2Icon />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
