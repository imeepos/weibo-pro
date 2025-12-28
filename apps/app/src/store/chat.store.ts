/**
 * Chat Store - 聊天状态管理
 *
 * 使用 Zustand 进行状态管理，支持多任务并行
 */

import { create } from 'zustand';
import { socketService } from '@/services';
import type { ChatMessage, Session, ConnectionStatus, WsClaudeResponse, PermissionMode, ApprovalRequest } from '@/types';

interface Task {
  id: string;
  serverTaskId: string | null;
  name: string;
  messages: ChatMessage[];
  session: Session | null;
  isLoading: boolean;
  streamingMessageId: string | null;
  messageSequence: number;
  tokenUsage: {
    used: number;
    total: number;
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  } | null;
  createdAt: number;
}

interface ChatState {
  connectionStatus: ConnectionStatus;
  clientId: string | null;
  tasks: Task[];
  activeTaskId: string | null;
  error: string | null;
  permissionMode: PermissionMode;
  pendingApproval: ApprovalRequest | null;

  connect: (serverUrl?: string) => void;
  disconnect: () => void;
  createTask: (name: string) => string;
  switchTask: (taskId: string) => void;
  closeTask: (taskId: string) => void;
  sendMessage: (content: string, taskId?: string) => void;
  clearMessages: (taskId: string) => void;
  abortTask: (taskId: string) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  let subscribed = false;

  const getTask = (taskId: string) => get().tasks.find(t => t.id === taskId || t.serverTaskId === taskId);
  const getActiveTask = () => {
    const { tasks, activeTaskId } = get();
    return tasks.find(t => t.id === activeTaskId);
  };

  const addMessage = (taskId: string, message: Omit<ChatMessage, 'sequence'>) => {
    const task = getTask(taskId);
    if (!task) return;

    const newMessage = { ...message, sequence: task.messageSequence };
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId
          ? { ...t, messages: [...t.messages, newMessage], messageSequence: t.messageSequence + 1 }
          : t
      ),
    });
  };

  const updateMessage = (taskId: string, id: string, updates: Partial<ChatMessage>) => {
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId
          ? { ...t, messages: t.messages.map(m => (m.id === id ? { ...m, ...updates } : m)) }
          : t
      ),
    });
  };

  const subscribeToSocket = () => {
    if (subscribed) return;
    subscribed = true;

    socketService.getConnectionStatus().subscribe(status => set({ connectionStatus: status }));
    socketService.getClientId().subscribe(clientId => set({ clientId }));

    socketService.getTaskCreated().subscribe(({ taskId }) => {
      const activeTask = getActiveTask();
      if (activeTask && !activeTask.serverTaskId) {
        set({ tasks: get().tasks.map(t => (t.id === activeTask.id ? { ...t, serverTaskId: taskId, isLoading: true } : t)) });
      }
    });

    socketService.getResponses().subscribe((response: WsClaudeResponse) => {
      const task = getTask(response.taskId);
      if (!task) return;

      switch (response.type) {
        case 'session-created': {
          const sessionData = response.data as { sessionId: string };
          const session = { id: sessionData.sessionId, createdAt: Date.now(), lastMessageAt: Date.now(), messages: [] };
          set({ tasks: get().tasks.map(t => (t.id === response.taskId ? { ...t, session } : t)) });
          break;
        }

        case 'message': {
          const messageData = response.data as any;
          if (messageData.type === 'assistant' && messageData.message?.content) {
            if (task.streamingMessageId) {
              updateMessage(task.id, task.streamingMessageId, { isStreaming: false });
            }

            const content = messageData.message.content;
            const text = Array.isArray(content)
              ? content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
              : typeof content === 'string' ? content : '';

            if (text) {
              const newId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              addMessage(task.id, { id: newId, role: 'assistant', content: text, timestamp: Date.now(), taskId: response.taskId, messageType: 'text', isStreaming: true });
              set({ tasks: get().tasks.map(t => (t.id === task.id ? { ...t, streamingMessageId: newId } : t)) });
            }
          } else if (messageData.type === 'content_block_delta' && messageData.delta?.text && task.streamingMessageId) {
            const existingMsg = task.messages.find(m => m.id === task.streamingMessageId);
            updateMessage(task.id, task.streamingMessageId, { content: (existingMsg?.content || '') + messageData.delta.text });
          }
          break;
        }

        case 'token-budget': {
          const tokenData = response.data as any;
          set({
            tasks: get().tasks.map(t =>
              t.id === task.id
                ? { ...t, tokenUsage: { used: tokenData.used, total: tokenData.total, input: tokenData.input || 0, output: tokenData.output || 0, cacheRead: tokenData.cacheRead || 0, cacheCreation: tokenData.cacheCreation || 0 } }
                : t
            ),
          });
          break;
        }

        case 'complete': {
          if (task.streamingMessageId) {
            updateMessage(task.id, task.streamingMessageId, { isStreaming: false });
          }
          set({ tasks: get().tasks.map(t => (t.id === task.id ? { ...t, isLoading: false, streamingMessageId: null } : t)) });
          break;
        }

        case 'error': {
          const errorData = response.data as { message: string };
          set({ error: errorData.message, tasks: get().tasks.map(t => (t.id === task.id ? { ...t, isLoading: false } : t)) });
          break;
        }

        case 'approval-request': {
          const approvalData = response.data as ApprovalRequest;
          set({ pendingApproval: approvalData });
          break;
        }
      }
    });

    socketService.getErrors().subscribe(error => set({ error: error.data.message }));
  };

  return {
    connectionStatus: 'disconnected',
    clientId: null,
    tasks: [],
    activeTaskId: null,
    error: null,
    permissionMode: 'bypassPermissions',
    pendingApproval: null,

    connect: (serverUrl?: string) => {
      subscribeToSocket();
      socketService.connect(serverUrl);
    },

    disconnect: () => socketService.disconnect(),

    createTask: (name: string) => {
      const taskId = `task_${Date.now()}`;
      const newTask: Task = {
        id: taskId,
        serverTaskId: null,
        name,
        messages: [],
        session: null,
        isLoading: false,
        streamingMessageId: null,
        messageSequence: 0,
        tokenUsage: null,
        createdAt: Date.now(),
      };
      set({ tasks: [...get().tasks, newTask], activeTaskId: taskId });
      return taskId;
    },

    switchTask: (taskId: string) => set({ activeTaskId: taskId }),

    closeTask: (taskId: string) => {
      const { tasks, activeTaskId } = get();
      const newTasks = tasks.filter(t => t.id !== taskId);
      set({
        tasks: newTasks,
        activeTaskId: activeTaskId === taskId ? (newTasks[0]?.id || null) : activeTaskId,
      });
    },

    sendMessage: (content: string, taskId?: string) => {
      const targetTaskId = taskId || get().activeTaskId;
      if (!targetTaskId) return;

      const task = getTask(targetTaskId);
      if (!task) return;

      addMessage(targetTaskId, { id: `msg_${Date.now()}`, role: 'user', content, timestamp: Date.now() });
      set({ error: null });

      socketService.sendCommand({ command: content, sessionId: task.session?.id, permissionMode: get().permissionMode });
    },

    clearMessages: (taskId: string) => {
      set({ tasks: get().tasks.map(t => (t.id === taskId ? { ...t, messages: [], session: null, messageSequence: 0 } : t)) });
    },

    abortTask: (taskId: string) => {
      socketService.abortTask(taskId);
      set({ tasks: get().tasks.map(t => (t.id === taskId ? { ...t, isLoading: false, streamingMessageId: null } : t)) });
    },

    setPermissionMode: (mode: PermissionMode) => set({ permissionMode: mode }),

    approveRequest: (requestId: string) => {
      socketService.sendApproval(requestId, true);
      set({ pendingApproval: null });
    },

    rejectRequest: (requestId: string) => {
      socketService.sendApproval(requestId, false);
      set({ pendingApproval: null });
    },
  };
});
