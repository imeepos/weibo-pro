'use client';

import * as React from 'react';

import { EmojiSettings } from '@platejs/emoji';
import type { EmojiIconList } from '@platejs/emoji';
import type { UseEmojiPickerType } from '@platejs/emoji/react';

import { cn } from '@sker/ui/lib/utils';

import { emojiCategoryIcons, emojiSearchIcons } from './icons';
import { EmojiPickerContent } from './emoji-picker-content';
import { EmojiPickerNavigation } from './emoji-picker-navigation';
import { EmojiPickerPreview } from './emoji-picker-preview';
import {
    EmojiPickerSearchAndClear,
    EmojiPickerSearchBar,
} from './emoji-picker-search';

export function EmojiPicker({
    clearSearch,
    emoji,
    emojiLibrary,
    focusedCategory,
    hasFound,
    i18n,
    icons = {
        categories: emojiCategoryIcons,
        search: emojiSearchIcons,
    },
    isSearching,
    refs,
    searchResult,
    searchValue,
    setSearch,
    settings = EmojiSettings,
    visibleCategories,
    handleCategoryClick,
    onMouseOver,
    onSelectEmoji,
}: Omit<UseEmojiPickerType, 'icons'> & {
    icons?: EmojiIconList<React.ReactElement>;
}) {
    return (
        <div
            className={cn(
                'flex flex-col rounded-xl bg-popover text-popover-foreground',
                'h-[23rem] w-80 border shadow-md'
            )}
        >
            <EmojiPickerNavigation
                onClick={handleCategoryClick}
                emojiLibrary={emojiLibrary}
                focusedCategory={focusedCategory}
                i18n={i18n}
                icons={icons}
            />
            <EmojiPickerSearchBar
                i18n={i18n}
                searchValue={searchValue}
                setSearch={setSearch}
            >
                <EmojiPickerSearchAndClear
                    clearSearch={clearSearch}
                    i18n={i18n}
                    searchValue={searchValue}
                />
            </EmojiPickerSearchBar>
            <EmojiPickerContent
                onMouseOver={onMouseOver}
                onSelectEmoji={onSelectEmoji}
                emojiLibrary={emojiLibrary}
                i18n={i18n}
                isSearching={isSearching}
                refs={refs}
                searchResult={searchResult}
                settings={settings}
                visibleCategories={visibleCategories}
            />
            <EmojiPickerPreview
                emoji={emoji}
                hasFound={hasFound}
                i18n={i18n}
                isSearching={isSearching}
            />
        </div>
    );
}
