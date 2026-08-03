import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@sker/ui/lib/utils';

// From toggleVariants
export const toolbarButtonVariants = cva(
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-[color,box-shadow] hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-checked:bg-accent aria-checked:text-accent-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        defaultVariants: {
            size: 'default',
            variant: 'default',
        },
        variants: {
            size: {
                default: 'h-9 min-w-9 px-2',
                lg: 'h-10 min-w-10 px-2.5',
                sm: 'h-8 min-w-8 px-1.5',
            },
            variant: {
                default: 'bg-transparent',
                outline:
                    'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
            },
        },
    }
);

export const dropdownArrowVariants = cva(
    cn(
        'inline-flex items-center justify-center rounded-r-md font-medium text-foreground text-sm transition-colors disabled:pointer-events-none disabled:opacity-50'
    ),
    {
        defaultVariants: {
            size: 'sm',
            variant: 'default',
        },
        variants: {
            size: {
                default: 'h-9 w-6',
                lg: 'h-10 w-8',
                sm: 'h-8 w-4',
            },
            variant: {
                default:
                    'bg-transparent hover:bg-muted hover:text-muted-foreground aria-checked:bg-accent aria-checked:text-accent-foreground',
                outline:
                    'border border-input border-l-0 bg-transparent hover:bg-accent hover:text-accent-foreground',
            },
        },
    }
);

export type ToolbarButtonVariants = VariantProps<typeof toolbarButtonVariants>;
export type DropdownArrowVariants = VariantProps<typeof dropdownArrowVariants>;
