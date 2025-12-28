/**
 * App - 应用入口
 */

import { useState } from 'react';
import { ChatPage, CliListPage } from '@/pages';
import { Button } from '@/components/ui';
import { MessageSquare, Users } from 'lucide-react';

type Page = 'chat' | 'cli-list';

interface SelectedClient {
  clientId: string;
  name?: string;
  description?: string;
}

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);

  const handleClientSelect = (client: SelectedClient) => {
    setSelectedClient(client);
    setCurrentPage('chat');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
        <Button
          variant={currentPage === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentPage('chat')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          聊天
        </Button>
        <Button
          variant={currentPage === 'cli-list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentPage('cli-list')}
        >
          <Users className="h-4 w-4 mr-2" />
          CLI 客户端
        </Button>
      </nav>

      {/* 页面内容 */}
      <div className="flex-1 overflow-hidden">
        {currentPage === 'chat' && <ChatPage selectedClient={selectedClient} />}
        {currentPage === 'cli-list' && <CliListPage onClientSelect={handleClientSelect} />}
      </div>
    </div>
  );
}
