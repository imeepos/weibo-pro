'use client';

import * as React from 'react';

import type { EmojiDropdownMenuOptions } from '@platejs/emoji/react';
import { useEmojiDropdownMenuState } from '@platejs/emoji/react';
import * as Popover from '@radix-ui/react-popover';
import { SmileIcon } from 'lucide-react';

import { ToolbarButton } from '@sker/ui/components/ui/toolbar';

import { EmojiPicker } from './emoji-toolbar-button/emoji-picker';

export function EmojiToolbarButton({
    options,
    ...props
}: {
    options?: EmojiDropdownMenuOptions;
} & React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
    const { emojiPickerState, isOpen, setIsOpen } =
        useEmojiDropdownMenuState(options);

    return (
        <EmojiPopover
            control={
                <ToolbarButton pressed={isOpen} tooltip="Emoji" isDropdown {...props}>
                    <SmileIcon />
                </ToolbarButton>
            }
            isOpen={isOpen}
            setIsOpen={setIsOpen}
        >
            <EmojiPicker
                {...emojiPickerState}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                settings={options?.settings}
            />
        </EmojiPopover>
    );
}

export function EmojiPopover({
    children,
    control,
    isOpen,
    setIsOpen,
}: {
    children: React.ReactNode;
    control: React.ReactNode;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}) {
    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>{control}</Popover.Trigger>

            <Popover.Portal>
                <Popover.Content className="z-100">{children}</Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export { EmojiPicker };
