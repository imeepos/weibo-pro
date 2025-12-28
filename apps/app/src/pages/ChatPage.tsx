/**
 * ChatPage - 聊天页面
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useChatStore } from '@/store';
import { MessageBubble, ChatInput, ConnectionStatus, TokenUsage, ChatSettings, ApprovalDialog } from '@/components';
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
    messages,
    isLoading,
    error,
    tokenUsage,
    pendingApproval,
    connect,
    sendMessage,
    abortCurrentTask,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log('[ChatPage] 渲染，pendingApproval:', pendingApproval);

  // 连接到服务器
  useEffect(() => {
    connect('http://192.168.5.89:8089');
  }, [connect]);

  // 滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 顶部状态栏 */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {selectedClient?.name || 'Claude'}
          </h1>
          {selectedClient?.description && (
            <p className="text-xs text-muted-foreground truncate">{selectedClient.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tokenUsage && <TokenUsage {...tokenUsage} />}
          <ConnectionStatus status={connectionStatus} clientId={clientId} />
          <ChatSettings />
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 shrink-0">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 消息列表 */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Claude 助手</h2>
            <p className="text-base text-muted-foreground text-center">发送消息开始对话</p>
          </div>
        ) : (
          <div className="py-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* 加载指示器 */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-2 shrink-0">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">思考中...</span>
        </div>
      )}

      {/* 输入框 */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} onAbort={abortCurrentTask} />

      {/* 批准对话框 */}
      <ApprovalDialog />
    </div>
  );
}
