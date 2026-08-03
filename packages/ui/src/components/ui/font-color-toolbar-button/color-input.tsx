'use client';

import React from 'react';

import { useComposedRef } from '@udecode/cn';

import { cn } from '@sker/ui/lib/utils';

export function ColorInput({
  children,
  className,
  value = '#000000',
  ...props
}: React.ComponentProps<'input'>) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col items-center">
      {React.Children.map(children, (child) => {
        if (!child) return child;

        return React.cloneElement(
          child as React.ReactElement<{
            onClick: () => void;
          }>,
          {
            onClick: () => inputRef.current?.click(),
          }
        );
      })}
      <input
        {...props}
        ref={useComposedRef(props.ref, inputRef)}
        className={cn('size-0 overflow-hidden border-0 p-0', className)}
        value={value}
        type="color"
      />
    </div>
  );
}
