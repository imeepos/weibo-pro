'use client';

import type { EmojiCategoryList } from '@platejs/emoji';
import type { UseEmojiPickerType } from '@platejs/emoji/react';

import { Button } from '@sker/ui/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@sker/ui/components/ui/tooltip';
import { cn } from '@sker/ui/lib/utils';

export function EmojiPickerNavigation({
    emojiLibrary,
    focusedCategory,
    i18n,
    icons,
    onClick,
}: {
    onClick: (id: EmojiCategoryList) => void;
} & Pick<
    UseEmojiPickerType,
    'emojiLibrary' | 'focusedCategory' | 'i18n' | 'icons'
>) {
    return (
        <TooltipProvider delayDuration={500}>
            <nav
                id="emoji-nav"
                className="mb-2.5 border-0 border-b border-b-border border-solid p-1.5"
            >
                <div className="relative flex items-center justify-evenly">
                    {emojiLibrary
                        .getGrid()
                        .sections()
                        .map(({ id }) => (
                            <Tooltip key={id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className={cn(
                                            'h-fit rounded-full fill-current p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground',
                                            id === focusedCategory &&
                                            'pointer-events-none bg-accent fill-current text-accent-foreground'
                                        )}
                                        onClick={() => {
                                            onClick(id);
                                        }}
                                        aria-label={i18n.categories[id]}
                                        type="button"
                                    >
                                        <span className="inline-flex size-5 items-center justify-center">
                                            {icons.categories[id].outline}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {i18n.categories[id]}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                </div>
            </nav>
        </TooltipProvider>
    );
}
