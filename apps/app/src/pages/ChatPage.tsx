/**
 * ChatPage - 聊天页面（支持多任务）
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/store';
import { MessageBubble, ChatInput, ConnectionStatus, TokenUsage, ChatSettings, ApprovalDialog, TaskTabs } from '@/components';
import { ScrollArea, Button } from '@/components/ui';

interface ChatPageProps {
  selectedClient?: {
    clientId: string;
    name?: string;
    description?: string;
  } | null;
}

export function ChatPage({ selectedClient }: ChatPageProps) {
  const navigate = useNavigate();
  const {
    connectionStatus,
    clientId,
    tasks,
    activeTaskId,
    error,
    pendingApproval,
    connect,
    createTask,
    switchTask,
    closeTask,
    sendMessage,
    abortTask,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [taskNameInput, setTaskNameInput] = useState('');

  const activeTask = tasks.find(t => t.id === activeTaskId);

  useEffect(() => {
    connect('http://192.168.5.89:8089');
    if (tasks.length === 0) {
      createTask('新任务');
    }
  }, [connect]);

  useEffect(() => {
    if (activeTask?.messages.length) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeTask?.messages]);

  const handleCreateTask = () => {
    const name = prompt('任务名称:', '新任务') || '新任务';
    createTask(name);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{selectedClient?.name || 'Claude'}</h1>
          {selectedClient?.description && <p className="text-xs text-muted-foreground truncate">{selectedClient.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConnectionStatus status={connectionStatus} clientId={clientId} />
          <ChatSettings />
        </div>
      </header>

      <TaskTabs
        tasks={tasks.map(t => ({ id: t.id, name: t.name, isLoading: t.isLoading }))}
        activeTaskId={activeTaskId}
        onSwitch={switchTask}
        onClose={closeTask}
        onCreate={handleCreateTask}
      />

      {error && (
        <div className="px-4 py-2 bg-destructive/10 shrink-0">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <ScrollArea className="flex-1">
        {!activeTask || activeTask.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{activeTask?.name || 'Claude 助手'}</h2>
            <p className="text-sm text-muted-foreground max-w-md">开始新的对话</p>
          </div>
        ) : (
          <div className="py-3">
            {activeTask.messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {activeTask?.tokenUsage && (
        <div className="flex justify-center px-4 py-2 border-t">
          <TokenUsage {...activeTask.tokenUsage} />
        </div>
      )}

      <div className="shrink-0 border-t">
        <ChatInput
          onSend={content => sendMessage(content)}
          isLoading={activeTask?.isLoading || false}
          onAbort={() => activeTask && abortTask(activeTask.id)}
        />
      </div>

      {pendingApproval && <ApprovalDialog request={pendingApproval} />}
    </div>
  );
}
