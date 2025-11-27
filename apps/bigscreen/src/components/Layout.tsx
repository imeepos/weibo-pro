import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'relative min-h-screen flex flex-col bg-background text-foreground',
      className
    )}>
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 relative overflow-auto p-0"
      >
        {children}
      </motion.main>
    </div>
  );
};

export default Layout;
