'use client';

import * as React from 'react';

import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import { ChevronDown } from 'lucide-react';

import {
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuSeparator,
} from '@sker/ui/components/ui/dropdown-menu';
import { Separator } from '@sker/ui/components/ui/separator';
import { cn } from '@sker/ui/lib/utils';

import { withTooltip } from './toolbar-with-tooltip.js';
import {
    type DropdownArrowVariants,
    type ToolbarButtonVariants,
    dropdownArrowVariants,
    toolbarButtonVariants,
} from './toolbar-variants.js';

export function Toolbar({
    className,
    ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
    return (
        <ToolbarPrimitive.Root
            className={cn('relative flex select-none items-center', className)}
            {...props}
        />
    );
}

export function ToolbarToggleGroup({
    className,
    ...props
}: React.ComponentProps<typeof ToolbarPrimitive.ToolbarToggleGroup>) {
    return (
        <ToolbarPrimitive.ToolbarToggleGroup
            className={cn('flex items-center', className)}
            {...props}
        />
    );
}

export function ToolbarLink({
    className,
    ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Link>) {
    return (
        <ToolbarPrimitive.Link
            className={cn('font-medium underline underline-offset-4', className)}
            {...props}
        />
    );
}

export function ToolbarSeparator({
    className,
    ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
    return (
        <ToolbarPrimitive.Separator
            className={cn('mx-2 my-1 w-px shrink-0 bg-border', className)}
            {...props}
        />
    );
}

type ToolbarButtonProps = {
    isDropdown?: boolean;
    pressed?: boolean;
} & Omit<
    React.ComponentPropsWithoutRef<typeof ToolbarToggleItem>,
    'asChild' | 'value'
> &
    ToolbarButtonVariants;

export const ToolbarButton = withTooltip(function ToolbarButton({
    children,
    className,
    isDropdown,
    pressed,
    size = 'sm',
    variant,
    ...props
}: ToolbarButtonProps) {
    return typeof pressed === 'boolean' ? (
        <ToolbarToggleGroup disabled={props.disabled} value="single" type="single">
            <ToolbarToggleItem
                className={cn(
                    toolbarButtonVariants({
                        size,
                        variant,
                    }),
                    isDropdown && 'justify-between gap-1 pr-1',
                    className
                )}
                value={pressed ? 'single' : ''}
                {...props}
            >
                {isDropdown ? (
                    <>
                        <div className="flex flex-1 items-center gap-2 whitespace-nowrap">
                            {children}
                        </div>
                        <div>
                            <ChevronDown
                                className="size-3.5 text-muted-foreground"
                                data-icon
                            />
                        </div>
                    </>
                ) : (
                    children
                )}
            </ToolbarToggleItem>
        </ToolbarToggleGroup>
    ) : (
        <ToolbarPrimitive.Button
            className={cn(
                toolbarButtonVariants({
                    size,
                    variant,
                }),
                isDropdown && 'pr-1',
                className
            )}
            {...props}
        >
            {children}
        </ToolbarPrimitive.Button>
    );
});

export function ToolbarSplitButton({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
    return (
        <ToolbarButton
            className={cn('group flex gap-0 px-0 hover:bg-transparent', className)}
            {...props}
        />
    );
}

type ToolbarSplitButtonPrimaryProps = Omit<
    React.ComponentPropsWithoutRef<typeof ToolbarToggleItem>,
    'value'
> &
    ToolbarButtonVariants;

export function ToolbarSplitButtonPrimary({
    children,
    className,
    size = 'sm',
    variant,
    ...props
}: ToolbarSplitButtonPrimaryProps) {
    return (
        <span
            className={cn(
                toolbarButtonVariants({
                    size,
                    variant,
                }),
                'rounded-r-none',
                'group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground',
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}

export function ToolbarSplitButtonSecondary({
    className,
    size,
    variant,
    ...props
}: React.ComponentPropsWithoutRef<'span'> &
    DropdownArrowVariants) {
    return (
        <span
            className={cn(
                dropdownArrowVariants({
                    size,
                    variant,
                }),
                'group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground',
                className
            )}
            onClick={(e) => e.stopPropagation()}
            role="button"
            {...props}
        >
            <ChevronDown className="size-3.5 text-muted-foreground" data-icon />
        </span>
    );
}

export function ToolbarToggleItem({
    className,
    size = 'sm',
    variant,
    ...props
}: React.ComponentProps<typeof ToolbarPrimitive.ToggleItem> &
    ToolbarButtonVariants) {
    return (
        <ToolbarPrimitive.ToggleItem
            className={cn(toolbarButtonVariants({ size, variant }), className)}
            {...props}
        />
    );
}

export function ToolbarGroup({
    children,
    className,
}: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'group/toolbar-group',
                'relative hidden has-[button]:flex',
                className
            )}
        >
            <div className="flex items-center">{children}</div>

            <div className="group-last/toolbar-group:hidden! mx-1.5 py-0.5">
                <Separator orientation="vertical" />
            </div>
        </div>
    );
}

export function ToolbarMenuGroup({
    children,
    className,
    label,
    ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup> & { label?: string }) {
    return (
        <>
            <DropdownMenuSeparator
                className={cn(
                    'hidden',
                    'mb-0 shrink-0 peer-has-[[role=menuitem]]/menu-group:block peer-has-[[role=menuitemradio]]/menu-group:block peer-has-[[role=option]]/menu-group:block'
                )}
            />

            <DropdownMenuRadioGroup
                {...props}
                className={cn(
                    'hidden',
                    'peer/menu-group group/menu-group my-1.5 has-[[role=menuitem]]:block has-[[role=menuitemradio]]:block has-[[role=option]]:block',
                    className
                )}
            >
                {label && (
                    <DropdownMenuLabel className="select-none font-semibold text-muted-foreground text-xs">
                        {label}
                    </DropdownMenuLabel>
                )}
                {children}
            </DropdownMenuRadioGroup>
        </>
    );
}
