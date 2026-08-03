'use client';

import * as React from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { Tooltip, TooltipTrigger } from '@sker/ui/components/ui/tooltip';
import { cn } from '@sker/ui/lib/utils';

type TooltipProps<T extends React.ElementType> = {
    tooltip?: React.ReactNode;
    tooltipContentProps?: Omit<
        React.ComponentPropsWithoutRef<typeof TooltipContent>,
        'children'
    >;
    tooltipProps?: Omit<
        React.ComponentPropsWithoutRef<typeof Tooltip>,
        'children'
    >;
    tooltipTriggerProps?: React.ComponentPropsWithoutRef<typeof TooltipTrigger>;
} & React.ComponentProps<T>;

function TooltipContent({
    children,
    className,
    // CHANGE
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                className={cn(
                    'z-50 w-fit origin-(--radix-tooltip-content-transform-origin) text-balance rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs',
                    className
                )}
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                {...props}
            >
                {children}
                {/* CHANGE */}
                {/* <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-primary fill-primary" /> */}
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    );
}

export function withTooltip<T extends React.ElementType>(Component: T) {
    return function ExtendComponent({
        tooltip,
        tooltipContentProps,
        tooltipProps,
        tooltipTriggerProps,
        ...props
    }: TooltipProps<T>) {
        const [mounted, setMounted] = React.useState(false);

        React.useEffect(() => {
            setMounted(true);
        }, []);

        const component = <Component {...(props as React.ComponentProps<T>)} />;

        if (tooltip && mounted) {
            return (
                <Tooltip {...tooltipProps}>
                    <TooltipTrigger asChild {...tooltipTriggerProps}>
                        {component}
                    </TooltipTrigger>

                    <TooltipContent {...tooltipContentProps}>{tooltip}</TooltipContent>
                </Tooltip>
            );
        }

        return component;
    };
}
