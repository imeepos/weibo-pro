'use client';

import React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';

import { useEditorRef, useEditorSelector } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@sker/ui/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';
import { ColorPicker } from './font-color-toolbar-button/color-picker';
import {
  DEFAULT_COLORS,
  DEFAULT_CUSTOM_COLORS,
} from './font-color-toolbar-button/colors';

export { ColorDropdownMenuItems } from './font-color-toolbar-button/color-dropdown-menu-items';
export { DEFAULT_COLORS } from './font-color-toolbar-button/colors';

export function FontColorToolbarButton({
  children,
  nodeType,
  tooltip,
}: {
  nodeType: string;
  tooltip?: string;
} & DropdownMenuProps) {
  const editor = useEditorRef();

  const selectionDefined = useEditorSelector(
    (editor) => !!editor.selection,
    []
  );

  const color = useEditorSelector(
    (editor) => editor.api.mark(nodeType) as string,
    [nodeType]
  );

  const [selectedColor, setSelectedColor] = React.useState<string>();
  const [open, setOpen] = React.useState(false);

  const onToggle = React.useCallback(
    (value = !open) => {
      setOpen(value);
    },
    [open, setOpen]
  );

  const updateColor = React.useCallback(
    (value: string) => {
      if (editor.selection) {
        setSelectedColor(value);

        editor.tf.select(editor.selection);
        editor.tf.focus();

        editor.tf.addMarks({ [nodeType]: value });
      }
    },
    [editor, nodeType]
  );

  const updateColorAndClose = React.useCallback(
    (value: string) => {
      updateColor(value);
      onToggle();
    },
    [onToggle, updateColor]
  );

  const clearColor = React.useCallback(() => {
    if (editor.selection) {
      editor.tf.select(editor.selection);
      editor.tf.focus();

      if (selectedColor) {
        editor.tf.removeMarks(nodeType);
      }

      onToggle();
    }
  }, [editor, selectedColor, onToggle, nodeType]);

  React.useEffect(() => {
    if (selectionDefined) {
      setSelectedColor(color);
    }
  }, [color, selectionDefined]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
      }}
      modal={false}
    >
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip={tooltip}>
          {children}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <ColorPicker
          color={selectedColor || color}
          clearColor={clearColor}
          colors={DEFAULT_COLORS}
          customColors={DEFAULT_CUSTOM_COLORS}
          updateColor={updateColorAndClose}
          updateCustomColor={updateColor}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
