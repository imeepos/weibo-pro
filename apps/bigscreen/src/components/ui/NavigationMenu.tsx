import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Activity,
  Users,
  Layout,
  Grid3X3,
  Network,
  Share2,
  Bot,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavigationMenuProps {
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'data-overview',
    label: '数据总览',
    path: '/index',
    icon: BarChart3,
    description: '全面数据概览与统计'
  },
  {
    id: 'event-analysis',
    label: '事件分析',
    path: '/event-analysis',
    icon: Activity,
    description: '热点事件深度分析'
  },
  {
    id: 'user-detection',
    label: '媒体检测面板',
    path: '/user-detection',
    icon: Users,
    description: '用户行为监测分析'
  }
];

const NavigationMenu: React.FC<NavigationMenuProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const renderNavigationGroup = (items: NavigationItem[], startIndex: number = 0) => (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (startIndex + index) * 0.1 }}
            className={cn(
              'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 group',
              isActive
                ? 'bg-gradient-to-r from-primary/15 to-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
            )}
          >
            <Icon className={cn(
              'w-5 h-5 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            )} />

            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-sm font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {item.label}
              </div>
              {item.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {item.description}
                </div>
              )}
            </div>

            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="w-2 h-2 bg-blue-400 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <nav className={cn('space-y-6', className)}>
      {renderNavigationGroup(navigationItems)}
    </nav>
  );
};

export default NavigationMenu;
