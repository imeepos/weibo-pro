'use client';

import * as React from 'react';

import type { UseEmojiPickerType } from '@platejs/emoji/react';

import { Button } from '@sker/ui/components/ui/button';
import { cn } from '@sker/ui/lib/utils';

import { emojiSearchIcons } from './icons';

export function EmojiPickerSearchBar({
    children,
    i18n,
    searchValue,
    setSearch,
}: {
    children: React.ReactNode;
} & Pick<UseEmojiPickerType, 'i18n' | 'searchValue' | 'setSearch'>) {
    return (
        <div className="flex items-center px-2">
            <div className="relative flex grow items-center">
                <input
                    className="block w-full appearance-none rounded-full border-0 bg-muted px-10 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none"
                    value={searchValue}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={i18n.search}
                    aria-label="Search"
                    autoComplete="off"
                    type="text"
                    autoFocus
                />
                {children}
            </div>
        </div>
    );
}

export function EmojiPickerSearchAndClear({
    clearSearch,
    i18n,
    searchValue,
}: Pick<UseEmojiPickerType, 'clearSearch' | 'i18n' | 'searchValue'>) {
    return (
        <div className="flex items-center text-foreground">
            <div
                className={cn(
                    '-translate-y-1/2 absolute top-1/2 left-2.5 z-10 flex size-5 items-center justify-center text-foreground'
                )}
            >
                {emojiSearchIcons.loupe}
            </div>
            {searchValue && (
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                        '-translate-y-1/2 absolute top-1/2 right-0.5 flex size-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-popover-foreground hover:bg-transparent'
                    )}
                    onClick={clearSearch}
                    title={i18n.clear}
                    aria-label="Clear"
                    type="button"
                >
                    {emojiSearchIcons.delete}
                </Button>
            )}
        </div>
    );
}
