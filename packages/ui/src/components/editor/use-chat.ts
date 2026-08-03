'use client';

import * as React from 'react';

import { useChat as useBaseChat } from '@ai-sdk/react';
import { AIChatPlugin } from '@platejs/ai/react';
import { DefaultChatTransport } from 'ai';
import { useEditorRef, usePluginOption } from 'platejs/react';

import { aiChatPlugin } from './plugins/ai-kit';

import { createMockFetch } from './use-chat/mock-fetch';
import { handleChatData } from './use-chat/on-data';

import type { ChatMessage } from './use-chat/types';

export type {
  Chat,
  ChatMessage,
  MessageDataPart,
  TComment,
  ToolName,
} from './use-chat/types';

export const useChat = () => {
  const editor = useEditorRef();
  const options = usePluginOption(aiChatPlugin, 'chatOptions');

  // remove when you implement the route /api/ai/command
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const _abortFakeStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const baseChat = useBaseChat<ChatMessage>({
    id: 'editor',
    transport: new DefaultChatTransport({
      api: options.api || '/api/ai/command',
      // Mock the API response. Remove it when you implement the route /api/ai/command
      fetch: createMockFetch({
        editor,
        abortControllerRef,
        getBodyOptions: () => editor.getOptions(aiChatPlugin).chatOptions?.body,
      }),
    }),
    onData: (data) => handleChatData(editor, data),
    ...options,
  });

  const chat = {
    ...baseChat,
    _abortFakeStream,
  };

  React.useEffect(() => {
    editor.setOption(AIChatPlugin, 'chat', chat as any);
  }, [chat.status, chat.messages, chat.error]);

  return chat;
};
