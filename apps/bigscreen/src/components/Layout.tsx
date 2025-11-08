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

  return (
    <div className={cn(
      'relative h-screen flex flex-col transition-colors duration-300',
      'bg-background text-foreground overflow-hidden'
    )}>
      {/* 背景装饰 - 优雅的径向渐变 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 右上角光晕 */}
        <div className={cn(
          'absolute -top-48 -right-32 w-[500px] h-[500px] rounded-full',
          'bg-gradient-radial from-primary/8 via-primary/3 to-transparent blur-3xl',
          'animate-pulse'
        )}
        style={{ animationDuration: '8s' }}
        ></div>

        {/* 左下角光晕 */}
        <div className={cn(
          'absolute -bottom-48 -left-40 w-[450px] h-[450px] rounded-full',
          'bg-gradient-radial from-purple-500/6 via-purple-500/2 to-transparent blur-[140px]',
          'animate-pulse'
        )}
        style={{ animationDuration: '10s', animationDelay: '2s' }}
        ></div>

        {/* 中心柔和光晕 */}
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full',
          'bg-gradient-radial from-emerald-400/4 via-emerald-400/1 to-transparent blur-[180px]',
          'animate-pulse'
        )}
        style={{ animationDuration: '12s', animationDelay: '4s' }}
        ></div>
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
      <div className="relative flex flex-1 overflow-hidden">
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
            'flex-1 relative transition-all duration-300 h-full',
            'overflow-y-auto',
            'bg-gray-50 dark:bg-gray-900',
            isFullscreen
              ? 'p-1'
              : 'px-3 py-3 sm:px-4 md:px-6 md:py-4 xl:p-6',
            className
          )}
        >
          {children}
        </motion.main>
      </div>


      {/* 全屏指示器 */}
      <FullscreenIndicator />
    </div>
  );
};

export default Layout;
