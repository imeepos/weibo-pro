import React from 'react';
import NavigationMenu from './ui/NavigationMenu';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/utils';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { realTimeData, isConnected } = useAppStore();

  if (!realTimeData) {
    return (
      <aside className={cn('glass-card border-r p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </aside>
    );
  }

  const { statistics } = realTimeData;

  return (
    <aside className={cn(
      'glass-card-flat flex flex-col overflow-y-auto scrollbar-hide',
      className
    )}>
      {/* 导航菜单 */}
      <div className="p-6">
        <NavigationMenu />
      </div>
    </aside>
  );
};

export default Sidebar;
