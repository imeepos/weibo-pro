'use client';

import * as React from 'react';

import { useChat as useBaseChat } from '@ai-sdk/react';
import { AIChatPlugin } from '@platejs/ai/react';
import { DefaultChatTransport } from 'ai';
import { useEditorRef, usePluginOption } from 'platejs/react';

import { aiChatPlugin } from './plugins/ai-kit';

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

  const baseChat = useBaseChat<ChatMessage>({
    id: 'editor',
    transport: new DefaultChatTransport({
      api: options.api || '/api/ai/command',
    }),
    onData: (data) => handleChatData(editor, data),
    ...options,
  });

  const chat = {
    ...baseChat,
  };

  React.useEffect(() => {
    editor.setOption(AIChatPlugin, 'chat', chat as any);
  }, [chat.status, chat.messages, chat.error]);

  return chat;
};
