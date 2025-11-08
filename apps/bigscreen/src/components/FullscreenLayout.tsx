import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface FullscreenLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const FullscreenLayout: React.FC<FullscreenLayoutProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'relative h-screen flex flex-col bg-background text-foreground overflow-hidden',
      className
    )}>
      {/* 背景装饰 - 更简洁的版本 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 中心柔和光晕 */}
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full',
          'bg-gradient-radial from-primary/4 via-primary/1 to-transparent blur-[180px]',
          'animate-pulse'
        )}
        style={{ animationDuration: '12s' }}
        ></div>
      </div>

      {/* 主内容区域 - 全屏展示 */}
      <motion.main
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'flex-1 relative overflow-hidden',
          'p-1'
        )}
      >
        {children}
      </motion.main>
    </div>
  );
};

export default FullscreenLayout;