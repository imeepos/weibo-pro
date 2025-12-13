import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, FullscreenLayout } from '@/components';
import DataOverview from '@/pages/DataOverview';
import CustomDataOverview from '@/pages/CustomDataOverview';
import EventAnalysis from '@/pages/EventAnalysis';
import EventDetail from '@/pages/EventDetail';
import UserDetection from '@/pages/UserDetection';
import UserRelationTopology from '@/pages/UserRelationTopology';
import { LayoutDemo } from '@/pages/LayoutDemo';
import BleMeshTopology from '@/pages/BleMeshTopology';
import WorkflowEditor from '@/pages/WorkflowEditor';
import CrawlerControl from '@/pages/CrawlerControl';
import LlmManagement from '@/pages/LlmManagement';
import LlmChatLogs from '@/pages/LlmChatLogs';
import HeroDemo from '@/pages/HeroDemo';
import MemoryGraphPage from '@/pages/MemoryGraphPage';
import PromptManagement from '@/pages/PromptManagement';
import WorkflowManagement from '@/pages/WorkflowManagement';
import { useTheme } from '@/hooks/useTheme';
import { cn, createLogger } from '@/utils';
import { initializeApp } from '@/services/appInitialization';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { ToastProvider } from '@/components/ui/Toast';

const logger = createLogger('App');

const App: React.FC = () => {
  const { theme } = useTheme();
  const [isAppInitialized, setIsAppInitialized] = useState(false);

  // 应用初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        // 设置初始化超时（10秒）
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );
        await Promise.race([
          initializeApp(),
          timeoutPromise
        ]);
        setIsAppInitialized(true);
      } catch (error) {
        setIsAppInitialized(true);
      }
    };

    initialize();
  }, []);

  // 显示加载状态
  if (!isAppInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner />
          <p className="text-gray-500 mt-4">正在注册组件和配置系统...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className={cn(
          'min-h-screen transition-colors duration-300',
          theme === 'dark' ? 'dark' : ''
        )}>
          <Routes>
            <Route
              path="/"
              element={
                <FullscreenLayout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="hero-demo"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <HeroDemo />
                    </motion.div>
                  </AnimatePresence>
                </FullscreenLayout>
              }
            />
            <Route
              path="/index"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="data-overview"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <DataOverview />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/data-overview"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="data-overview"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <DataOverview />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/event-analysis"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="event-analysis"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <EventAnalysis />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/event-analysis/:eventId"
              element={
                <FullscreenLayout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="event-detail"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <EventDetail />
                    </motion.div>
                  </AnimatePresence>
                </FullscreenLayout>
              }
            />
            <Route
              path="/user-detection"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="user-detection"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <UserDetection />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/custom-overview"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="custom-overview"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CustomDataOverview />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/layout-editor"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="layout-editor"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <LayoutDemo />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/ble-mesh-topology"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="ble-mesh-topology"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <BleMeshTopology />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/workflow-editor/:name?"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="workflow-editor"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <WorkflowEditor />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/crawler-control"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="crawler-control"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CrawlerControl />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/user-relation-topology"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="user-relation-topology"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <UserRelationTopology />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/llm-management"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="llm-management"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <LlmManagement />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/llm-chat-logs"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="llm-chat-logs"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <LlmChatLogs />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/memory-graph"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="memory-graph"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <MemoryGraphPage />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/prompt-management"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="prompt-management"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PromptManagement />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />
            <Route
              path="/workflow-management"
              element={
                <Layout>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="workflow-management"
                      className="h-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <WorkflowManagement />
                    </motion.div>
                  </AnimatePresence>
                </Layout>
              }
            />

          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
