/**
 * Chat Store - 聊天状态管理
 *
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand';
import { socketService } from '../services';
import type { ChatMessage, Session, ConnectionStatus, WsClaudeResponse } from '../types';

interface ChatState {
  /** 连接状态 */
  connectionStatus: ConnectionStatus;
  /** 客户端 ID */
  clientId: string | null;
  /** 当前会话 */
  currentSession: Session | null;
  /** 消息列表 */
  messages: ChatMessage[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 当前流式消息内容 */
  streamingContent: string;
  /** 当前任务 ID */
  currentTaskId: string | null;
  /** 错误信息 */
  error: string | null;

  /** 连接到服务器 */
  connect: (serverUrl?: string) => void;
  /** 断开连接 */
  disconnect: () => void;
  /** 发送消息 */
  sendMessage: (content: string) => void;
  /** 清空消息 */
  clearMessages: () => void;
  /** 中断当前任务 */
  abortCurrentTask: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  // 订阅 Socket 事件
  let subscribed = false;

  const subscribeToSocket = () => {
    if (subscribed) return;
    subscribed = true;

    // 连接状态
    socketService.getConnectionStatus().subscribe((status) => {
      set({ connectionStatus: status });
    });

    // 客户端 ID
    socketService.getClientId().subscribe((clientId) => {
      set({ clientId });
    });

    // 任务创建
    socketService.getTaskCreated().subscribe(({ taskId }) => {
      set({ currentTaskId: taskId, isLoading: true });
    });

    // 响应处理
    socketService.getResponses().subscribe((response: WsClaudeResponse) => {
      const state = get();

      switch (response.type) {
        case 'session-created': {
          const sessionData = response.data as { sessionId: string };
          set({
            currentSession: {
              id: sessionData.sessionId,
              createdAt: Date.now(),
              lastMessageAt: Date.now(),
              messages: [],
            },
          });
          break;
        }

        case 'message': {
          const messageData = response.data as { type: string; content?: string; text?: string };
          // 处理流式文本消息
          if (messageData.type === 'assistant' || messageData.content || messageData.text) {
            const content = messageData.content || messageData.text || '';
            if (content) {
              set({ streamingContent: state.streamingContent + content });
            }
          }
          break;
        }

        case 'complete': {
          const streamingContent = state.streamingContent;
          if (streamingContent) {
            // 将流式内容转为完整消息
            const assistantMessage: ChatMessage = {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: streamingContent,
              timestamp: Date.now(),
              taskId: response.taskId,
            };
            set({
              messages: [...state.messages, assistantMessage],
              streamingContent: '',
              isLoading: false,
              currentTaskId: null,
            });
          } else {
            set({ isLoading: false, currentTaskId: null });
          }
          break;
        }

        case 'error': {
          const errorData = response.data as { message: string };
          set({
            error: errorData.message,
            isLoading: false,
            currentTaskId: null,
            streamingContent: '',
          });
          break;
        }

        case 'token-budget': {
          // 可以在这里处理 token 使用情况
          break;
        }
      }
    });

    // 错误处理
    socketService.getErrors().subscribe((error) => {
      set({ error: error.data.message });
    });
  };

  return {
    connectionStatus: 'disconnected',
    clientId: null,
    currentSession: null,
    messages: [],
    isLoading: false,
    streamingContent: '',
    currentTaskId: null,
    error: null,

    connect: (serverUrl?: string) => {
      subscribeToSocket();
      socketService.connect(serverUrl);
    },

    disconnect: () => {
      socketService.disconnect();
    },

    sendMessage: (content: string) => {
      const state = get();

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      set({ messages: [...state.messages, userMessage], error: null });

      // 发送命令
      socketService.sendCommand({
        command: content,
        sessionId: state.currentSession?.id,
      });
    },

    clearMessages: () => {
      set({
        messages: [],
        currentSession: null,
        streamingContent: '',
        currentTaskId: null,
        error: null,
      });
    },

    abortCurrentTask: () => {
      const state = get();
      if (state.currentTaskId) {
        socketService.abortTask(state.currentTaskId);
        set({ isLoading: false, currentTaskId: null, streamingContent: '' });
      }
    },
  };
});
