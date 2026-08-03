import React from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@sker/ui/components/ui/button';
import type { LoadingState } from '@/types/tab-loading';

interface TabContentShellProps {
  loadingState: LoadingState;
  loadingText: string;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Tab 内容统一外壳：loading / error / success 三种状态渲染。
 */
export function TabContentShell({ loadingState, loadingText, onRetry, children }: TabContentShellProps) {
  if (loadingState === 'loading') {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm text-destructive">加载失败</p>
          <Button onClick={onRetry}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {children}
    </motion.div>
  );
}
