'use client';

import React from 'react';

import debounce from 'lodash/debounce.js';
import { PlusIcon } from 'lucide-react';

import { buttonVariants } from '@sker/ui/components/ui/button';
import { DropdownMenuItem } from '@sker/ui/components/ui/dropdown-menu';
import { cn } from '@sker/ui/lib/utils';

import { ColorDropdownMenuItems } from './color-dropdown-menu-items';
import { ColorInput } from './color-input';
import type { TColor } from './types';

export function ColorCustom({
  className,
  color,
  colors,
  customColors,
  updateColor,
  updateCustomColor,
  ...props
}: {
  colors: TColor[];
  customColors: TColor[];
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  color?: string;
} & React.ComponentPropsWithoutRef<'div'>) {
  const [customColor, setCustomColor] = React.useState<string>();
  const [value, setValue] = React.useState<string>(color || '#000000');

  React.useEffect(() => {
    if (
      !color ||
      customColors.some((c) => c.value === color) ||
      colors.some((c) => c.value === color)
    ) {
      return;
    }

    setCustomColor(color);
  }, [color, colors, customColors]);

  const computedColors = React.useMemo(
    () =>
      customColor
        ? [
            ...customColors,
            {
              isBrightColor: false,
              name: '',
              value: customColor,
            },
          ]
        : customColors,
    [customColor, customColors]
  );

  const updateCustomColorDebounced = React.useCallback(
    debounce(updateCustomColor, 100),
    [updateCustomColor]
  );

  return (
    <div className={cn('relative flex flex-col gap-4', className)} {...props}>
      <ColorDropdownMenuItems
        color={color}
        colors={computedColors}
        updateColor={updateColor}
      >
        <ColorInput
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            updateCustomColorDebounced(e.target.value);
          }}
        >
          <DropdownMenuItem
            className={cn(
              buttonVariants({
                size: 'icon',
                variant: 'outline',
              }),
              'absolute top-1 right-2 bottom-2 flex size-8 items-center justify-center rounded-full'
            )}
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <span className="sr-only">Custom</span>
            <PlusIcon />
          </DropdownMenuItem>
        </ColorInput>
      </ColorDropdownMenuItems>
    </div>
  );
}
