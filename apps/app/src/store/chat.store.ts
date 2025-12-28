/**
 * Chat Store - 聊天状态管理
 *
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand';
import { socketService } from '@/services';
import type { ChatMessage, Session, ConnectionStatus, WsClaudeResponse, PermissionMode, ApprovalRequest } from '@/types';

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
  /** 当前流式消息 ID */
  streamingMessageId: string | null;
  /** 当前任务 ID */
  currentTaskId: string | null;
  /** 消息序列号计数器 */
  messageSequence: number;
  /** 错误信息 */
  error: string | null;
  /** Token 使用情况 */
  tokenUsage: {
    used: number;
    total: number;
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  } | null;
  /** 权限模式 */
  permissionMode: PermissionMode;
  /** 待批准的请求 */
  pendingApproval: ApprovalRequest | null;

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
  /** 设置权限模式 */
  setPermissionMode: (mode: PermissionMode) => void;
  /** 清空上下文（重新开始新会话） */
  clearContext: () => void;
  /** 批准请求 */
  approveRequest: (requestId: string) => void;
  /** 拒绝请求 */
  rejectRequest: (requestId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  // 订阅 Socket 事件
  let subscribed = false;

  // 从 localStorage 恢复 session
  const restoreSession = (): Session | null => {
    try {
      const saved = localStorage.getItem('chat-session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // 辅助函数：添加消息
  const addMessage = (message: Omit<ChatMessage, 'sequence'>) => {
    const state = get();
    const newMessage = { ...message, sequence: state.messageSequence };
    set({
      messages: [...state.messages, newMessage].sort((a, b) => a.sequence - b.sequence),
      messageSequence: state.messageSequence + 1,
    });
  };

  // 辅助函数：更新消息
  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    const state = get();
    set({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    });
  };

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
      console.log('[ChatStore] 处理响应:', response.type, response.data);

      switch (response.type) {
        case 'session-created': {
          const sessionData = response.data as { sessionId: string };
          const session = {
            id: sessionData.sessionId,
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
            messages: [],
          };
          set({ currentSession: session });
          localStorage.setItem('chat-session', JSON.stringify(session));
          break;
        }

        case 'message': {
          const messageData = response.data as any;

          // 系统初始化消息
          if (messageData.type === 'system' && messageData.subtype === 'init') {
            addMessage({
              id: `sys_${Date.now()}`,
              role: 'system',
              content: '系统初始化完成',
              timestamp: Date.now(),
              messageType: 'system-init',
            });
          }
          // Assistant 消息 - 新的完整消息
          else if (messageData.type === 'assistant' && messageData.message?.content) {
            // 先完成当前流式消息（如果有）
            const currentStreamingId = state.streamingMessageId;
            if (currentStreamingId) {
              updateMessage(currentStreamingId, { isStreaming: false });
              set({ streamingMessageId: null });
            }

            const content = messageData.message.content;
            if (Array.isArray(content)) {
              const textBlocks = content.filter((block: any) => block.type === 'text');
              const text = textBlocks.map((block: any) => block.text).join('');

              // 创建新消息
              if (text) {
                const newId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                addMessage({
                  id: newId,
                  role: 'assistant',
                  content: text,
                  timestamp: Date.now(),
                  taskId: response.taskId,
                  messageType: 'text',
                  isStreaming: true,
                });
                set({ streamingMessageId: newId });
              }

              // 工具使用消息
              const toolBlocks = content.filter((block: any) => block.type === 'tool_use');
              toolBlocks.forEach((tool: any) => {
                addMessage({
                  id: `tool_${Date.now()}_${tool.id}`,
                  role: 'system',
                  content: `使用工具: ${tool.name}`,
                  timestamp: Date.now(),
                  messageType: 'tool-use',
                  metadata: { toolName: tool.name },
                });
              });
            } else if (typeof content === 'string') {
              const newId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              addMessage({
                id: newId,
                role: 'assistant',
                content,
                timestamp: Date.now(),
                taskId: response.taskId,
                messageType: 'text',
                isStreaming: true,
              });
              set({ streamingMessageId: newId });
            }
          }
          // 流式内容增量 - 追加到当前消息
          else if (messageData.type === 'content_block_delta' && messageData.delta?.text) {
            const streamingId = state.streamingMessageId;
            if (streamingId) {
              const existingMsg = state.messages.find((m) => m.id === streamingId);
              updateMessage(streamingId, {
                content: (existingMsg?.content || '') + messageData.delta.text,
              });
            }
          } else if (messageData.type === 'content_block_start' && messageData.content_block?.text) {
            const streamingId = state.streamingMessageId;
            if (streamingId) {
              const existingMsg = state.messages.find((m) => m.id === streamingId);
              updateMessage(streamingId, {
                content: (existingMsg?.content || '') + messageData.content_block.text,
              });
            }
          } else if (messageData.text) {
            const streamingId = state.streamingMessageId;
            if (streamingId) {
              const existingMsg = state.messages.find((m) => m.id === streamingId);
              updateMessage(streamingId, {
                content: (existingMsg?.content || '') + messageData.text,
              });
            }
          } else if (messageData.content) {
            const streamingId = state.streamingMessageId;
            if (streamingId) {
              const existingMsg = state.messages.find((m) => m.id === streamingId);
              updateMessage(streamingId, {
                content: (existingMsg?.content || '') + messageData.content,
              });
            }
          }
          break;
        }

        case 'tool-use': {
          const toolData = response.data as any;
          console.log('[ChatStore] 🔧 收到工具执行请求:', toolData);

          // 添加工具使用消息
          addMessage({
            id: `tool_${Date.now()}_${toolData.id || Math.random().toString(36).substr(2, 9)}`,
            role: 'system',
            content: `执行工具: ${toolData.name || '未知工具'}`,
            timestamp: Date.now(),
            messageType: 'tool-use',
            metadata: {
              toolName: toolData.name,
              toolInput: toolData.input,
            },
          });
          break;
        }

        case 'result': {
          const resultData = response.data as any;
          if (resultData.subtype === 'success' && resultData.timing) {
            addMessage({
              id: `result_${Date.now()}`,
              role: 'system',
              content: '执行完成',
              timestamp: Date.now(),
              messageType: 'result',
              metadata: {
                duration: resultData.timing.duration,
                status: 'success',
              },
            });
          }
          break;
        }

        case 'token-budget': {
          const tokenData = response.data as any;
          if (tokenData.used !== undefined && tokenData.total !== undefined) {
            set({
              tokenUsage: {
                used: tokenData.used,
                total: tokenData.total,
                input: tokenData.input || 0,
                output: tokenData.output || 0,
                cacheRead: tokenData.cacheRead || 0,
                cacheCreation: tokenData.cacheCreation || 0,
              },
            });
          }
          break;
        }

        case 'complete': {
          // 标记流式消息完成
          const streamingId = state.streamingMessageId;
          if (streamingId) {
            updateMessage(streamingId, { isStreaming: false });
          }

          // 添加完成标记
          addMessage({
            id: `complete_${Date.now()}`,
            role: 'system',
            content: '任务完成',
            timestamp: Date.now(),
            messageType: 'complete',
          });

          set({
            isLoading: false,
            currentTaskId: null,
            streamingMessageId: null,
          });
          break;
        }

        case 'error': {
          const errorData = response.data as { message: string };
          set({
            error: errorData.message,
            isLoading: false,
            currentTaskId: null,
            streamingMessageId: null,
          });
          break;
        }

        case 'approval-request': {
          const approvalData = response.data as ApprovalRequest;
          console.log('[ChatStore] 📥 收到批准请求:', approvalData);
          console.log('[ChatStore] 📥 当前 pendingApproval 状态:', state.pendingApproval);
          set({ pendingApproval: approvalData });
          console.log('[ChatStore] ✅ 批准请求已设置到状态，新值:', approvalData);

          // 添加批准请求消息
          addMessage({
            id: `approval_${Date.now()}`,
            role: 'system',
            content: `需要批准: ${approvalData.description}`,
            timestamp: Date.now(),
            messageType: 'system-init',
          });
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
    currentSession: restoreSession(),
    messages: [],
    isLoading: false,
    streamingMessageId: null,
    currentTaskId: null,
    messageSequence: 0,
    error: null,
    tokenUsage: null,
    permissionMode: 'bypassPermissions',
    pendingApproval: null,

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
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      });
      set({ error: null });

      // 发送命令
      socketService.sendCommand({
        command: content,
        sessionId: state.currentSession?.id,
        permissionMode: state.permissionMode,
      });
    },

    clearMessages: () => {
      set({
        messages: [],
        currentSession: null,
        streamingMessageId: null,
        currentTaskId: null,
        messageSequence: 0,
        error: null,
      });
    },

    abortCurrentTask: () => {
      const state = get();
      if (state.currentTaskId) {
        socketService.abortTask(state.currentTaskId);
        set({
          isLoading: false,
          currentTaskId: null,
          streamingMessageId: null,
        });
      }
    },

    setPermissionMode: (mode: PermissionMode) => {
      set({ permissionMode: mode });
    },

    clearContext: () => {
      localStorage.removeItem('chat-session');
      set({
        messages: [],
        currentSession: null,
        streamingMessageId: null,
        currentTaskId: null,
        messageSequence: 0,
        error: null,
        tokenUsage: null,
      });
    },

    approveRequest: (requestId: string) => {
      console.log('[ChatStore] ✅ 用户批准请求:', requestId);
      socketService.sendApproval(requestId, true);
      set({ pendingApproval: null });
    },

    rejectRequest: (requestId: string) => {
      console.log('[ChatStore] ❌ 用户拒绝请求:', requestId);
      socketService.sendApproval(requestId, false);
      set({ pendingApproval: null });
    },
  };
});
