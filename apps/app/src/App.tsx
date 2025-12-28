/**
 * App - 应用入口
 */

import { BrowserRouter, Routes, Route, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ChatPage, CliListPage } from '@/pages';
import { Button } from '@/components/ui';
import { MessageSquare, Users } from 'lucide-react';

interface SelectedClient {
  clientId: string;
  name?: string;
  description?: string;
}

function Layout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const handleClientSelect = (client: SelectedClient) => {
    navigate(`/chat?clientId=${client.clientId}&name=${encodeURIComponent(client.name || '')}&description=${encodeURIComponent(client.description || '')}`);
  };

  const selectedClient = searchParams.get('clientId') ? {
    clientId: searchParams.get('clientId')!,
    name: searchParams.get('name') || undefined,
    description: searchParams.get('description') || undefined,
  } : null;

  const showBottomNav = location.pathname !== '/chat';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<CliListPage onClientSelect={handleClientSelect} />} />
          <Route path="/chat" element={<ChatPage selectedClient={selectedClient} />} />
        </Routes>
      </div>

      {showBottomNav && (
        <nav className="flex items-center justify-around px-4 py-3 border-t border-border bg-background shrink-0">
        <NavLink to="/">
          {({ isActive }) => (
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
              <Users className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Agents</span>
            </Button>
          )}
        </NavLink>
      </nav>
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
