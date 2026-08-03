'use client';

import React from 'react';

import { EraserIcon } from 'lucide-react';

import { DropdownMenuItem } from '@sker/ui/components/ui/dropdown-menu';
import { cn } from '@sker/ui/lib/utils';

import { ToolbarMenuGroup } from '../toolbar';
import { ColorCustom } from './color-custom';
import { ColorDropdownMenuItems } from './color-dropdown-menu-items';
import type { TColor } from './types';

function PureColorPicker({
  className,
  clearColor,
  color,
  colors,
  customColors,
  updateColor,
  updateCustomColor,
  ...props
}: React.ComponentProps<'div'> & {
  colors: TColor[];
  customColors: TColor[];
  clearColor: () => void;
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  color?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <ToolbarMenuGroup label="Custom Colors">
        <ColorCustom
          color={color}
          className="px-2"
          colors={colors}
          customColors={customColors}
          updateColor={updateColor}
          updateCustomColor={updateCustomColor}
        />
      </ToolbarMenuGroup>
      <ToolbarMenuGroup label="Default Colors">
        <ColorDropdownMenuItems
          color={color}
          className="px-2"
          colors={colors}
          updateColor={updateColor}
        />
      </ToolbarMenuGroup>
      {color && (
        <ToolbarMenuGroup>
          <DropdownMenuItem className="p-2" onClick={clearColor}>
            <EraserIcon />
            <span>Clear</span>
          </DropdownMenuItem>
        </ToolbarMenuGroup>
      )}
    </div>
  );
}

export const ColorPicker = React.memo(
  PureColorPicker,
  (prev, next) =>
    prev.color === next.color &&
    prev.colors === next.colors &&
    prev.customColors === next.customColors
);
