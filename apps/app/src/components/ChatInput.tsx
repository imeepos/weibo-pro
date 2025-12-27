/**
 * ChatInput - 聊天输入框组件
 */

import { useState, useCallback, type KeyboardEvent } from 'react';
import { Send, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  onAbort?: () => void;
}

export function ChatInput({ onSend, isLoading, onAbort }: ChatInputProps) {
  const [inputText, setInputText] = useState('');

  const handleSend = useCallback(() => {
    const trimmedText = inputText.trim();
    if (trimmedText && !isLoading) {
      onSend(trimmedText);
      setInputText('');
    }
  }, [inputText, isLoading, onSend]);

  const handleAbort = useCallback(() => {
    if (isLoading && onAbort) {
      onAbort();
    }
  }, [isLoading, onAbort]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-background border-t border-border">
      <div className="flex-1 min-h-[44px] max-h-[120px]">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={isLoading}
          className={cn(
            'min-h-[44px] max-h-[100px] resize-none bg-secondary border-0 rounded-2xl px-4 py-3',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'placeholder:text-muted-foreground'
          )}
          rows={1}
        />
      </div>
      {isLoading ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAbort}
          className="h-11 w-11 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <StopCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={!inputText.trim()}
          className={cn(
            'h-11 w-11 rounded-full',
            inputText.trim() ? 'text-primary hover:text-primary hover:bg-primary/10' : 'text-muted-foreground'
          )}
        >
          <Send className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
