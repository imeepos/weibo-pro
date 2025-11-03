import React from 'react';
import { motion } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import FullscreenIndicator from './ui/FullscreenIndicator';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  const { isFullscreen } = useFullscreen();
  const { isDark } = useTheme();

  return (
    <div className={cn(
      'relative min-h-screen flex flex-col transition-colors duration-300',
      'bg-background text-foreground overflow-x-hidden',
      'xl:overflow-hidden'
    )}>
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          'absolute -top-48 -right-32 w-96 h-96 rounded-full blur-3xl',
          isDark ? 'bg-blue-500/15' : 'bg-primary/15'
        )}></div>
        <div className={cn(
          'absolute -bottom-48 -left-40 w-96 h-96 rounded-full blur-[160px]',
          isDark ? 'bg-purple-500/15' : 'bg-sky-400/10'
        )}></div>
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[200px]',
          isDark ? 'bg-green-500/10' : 'bg-emerald-300/10'
        )}></div>
      </div>

      {/* 头部 */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header className="flex-shrink-0 z-10 relative" />
      </motion.div>

      {/* 主要内容区域 */}
      <div className="relative flex flex-1 overflow-visible xl:overflow-hidden">
        {/* 侧边栏 - 全屏时隐藏 */}
        {!isFullscreen && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 w-64"
          >
            <Sidebar className="h-full" />
          </motion.div>
        )}

        {/* 主内容区域 */}
        <motion.main
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(
            'flex-1 relative transition-all duration-300',
            'overflow-visible xl:overflow-hidden',
            className
          )}
        >
          <div className={cn(
            'h-full transition-all duration-300',
            isFullscreen
              ? 'p-1 xl:overflow-auto xl:scrollbar-hide'
              : 'px-3 py-3 sm:px-4 md:px-6 md:py-4 xl:p-6 xl:overflow-auto xl:scrollbar-hide'
          )}>
            {children}
          </div>
        </motion.main>
      </div>


      {/* 全屏指示器 */}
      <FullscreenIndicator />
    </div>
  );
};

export default Layout;
