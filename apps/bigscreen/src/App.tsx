import React, { useEffect, useState, Suspense, lazy, ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, FullscreenLayout } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import { cn, createLogger } from '@/utils';
import { initializeApp } from '@/services/appInitialization';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { ToastProvider } from '@/components/ui/Toast';

const logger = createLogger('App');

// 懒加载页面组件 - 实现路由级代码分割
const DataOverview = lazy(() => import('@/pages/DataOverview'));
const CustomDataOverview = lazy(() => import('@/pages/CustomDataOverview'));
const EventAnalysis = lazy(() => import('@/pages/EventAnalysis'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const UserDetection = lazy(() => import('@/pages/UserDetection'));
const UserDetection3D = lazy(() => import('@/pages/UserDetection3D'));
const UserRelationTopology = lazy(() => import('@/pages/UserRelationTopology'));
const LayoutDemo = lazy(() => import('@/pages/LayoutDemo').then(m => ({ default: m.LayoutDemo })));
const BleMeshTopology = lazy(() => import('@/pages/BleMeshTopology'));
const WorkflowEditor = lazy(() => import('@/pages/WorkflowEditor'));
const CrawlerControl = lazy(() => import('@/pages/CrawlerControl'));
const LlmManagement = lazy(() => import('@/pages/LlmManagement'));
const LlmChatLogs = lazy(() => import('@/pages/LlmChatLogs'));
const HeroDemo = lazy(() => import('@/pages/HeroDemo'));
const MemoryGraphPage = lazy(() => import('@/pages/MemoryGraphPage'));
const PromptManagement = lazy(() => import('@/pages/PromptManagement'));
const WorkflowManagement = lazy(() => import('@/pages/WorkflowManagement'));
const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));
const DerivedNodeWorkbench = lazy(() => import('@/pages/DerivedNodeWorkbench'));
const WordCloudPage = lazy(() => import('@/pages/WordCloudPage'));

// 页面加载占位组件
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner />
  </div>
);

// 动画页面包装器 - 减少重复代码
interface AnimatedPageProps {
  children: React.ReactNode;
  pageKey: string;
}

const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, pageKey }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={pageKey}
      className="h-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </motion.div>
  </AnimatePresence>
);

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
      <Router>
        <div className={cn(
          'min-h-screen transition-colors duration-300',
          theme === 'dark' ? 'dark' : ''
        )}>
          <Routes>
            {/* 全屏布局页面 */}
            <Route path="/" element={<FullscreenLayout><AnimatedPage pageKey="hero"><HeroDemo /></AnimatedPage></FullscreenLayout>} />
            <Route path="/event-analysis/:eventId" element={<FullscreenLayout><AnimatedPage pageKey="event-detail"><EventDetail /></AnimatedPage></FullscreenLayout>} />
            <Route path="/chat" element={<FullscreenLayout><AnimatedPage pageKey="chat"><ChatPage /></AnimatedPage></FullscreenLayout>} />

            {/* 标准布局页面 */}
            <Route path="/index" element={<Layout><AnimatedPage pageKey="data-overview"><DataOverview /></AnimatedPage></Layout>} />
            <Route path="/data-overview" element={<Layout><AnimatedPage pageKey="data-overview"><DataOverview /></AnimatedPage></Layout>} />
            <Route path="/event-analysis" element={<Layout><AnimatedPage pageKey="event-analysis"><EventAnalysis /></AnimatedPage></Layout>} />
            <Route path="/user-detection" element={<Layout><AnimatedPage pageKey="user-detection"><UserDetection /></AnimatedPage></Layout>} />
            <Route path="/user-detection-3d" element={<FullscreenLayout><AnimatedPage pageKey="user-detection-3d"><UserDetection3D /></AnimatedPage></FullscreenLayout>} />
            <Route path="/custom-overview" element={<Layout><AnimatedPage pageKey="custom-overview"><CustomDataOverview /></AnimatedPage></Layout>} />
            <Route path="/layout-editor" element={<Layout><AnimatedPage pageKey="layout-editor"><LayoutDemo /></AnimatedPage></Layout>} />
            <Route path="/ble-mesh-topology" element={<Layout><AnimatedPage pageKey="ble-mesh"><BleMeshTopology /></AnimatedPage></Layout>} />
            <Route path="/workflow-editor/:name?" element={<Layout><AnimatedPage pageKey="workflow-editor"><WorkflowEditor /></AnimatedPage></Layout>} />
            <Route path="/crawler-control" element={<Layout><AnimatedPage pageKey="crawler"><CrawlerControl /></AnimatedPage></Layout>} />
            <Route path="/user-relation-topology" element={<Layout><AnimatedPage pageKey="user-relation"><UserRelationTopology /></AnimatedPage></Layout>} />
            <Route path="/llm-management" element={<Layout><AnimatedPage pageKey="llm-mgmt"><LlmManagement /></AnimatedPage></Layout>} />
            <Route path="/llm-chat-logs" element={<Layout><AnimatedPage pageKey="llm-logs"><LlmChatLogs /></AnimatedPage></Layout>} />
            <Route path="/memory-graph" element={<Layout><AnimatedPage pageKey="memory-graph"><MemoryGraphPage /></AnimatedPage></Layout>} />
            <Route path="/prompt-management" element={<Layout><AnimatedPage pageKey="prompt-mgmt"><PromptManagement /></AnimatedPage></Layout>} />
            <Route path="/workflow-management" element={<Layout><AnimatedPage pageKey="workflow-mgmt"><WorkflowManagement /></AnimatedPage></Layout>} />
            <Route path="/derived-node-workbench" element={<Layout><AnimatedPage pageKey="derived-node"><DerivedNodeWorkbench /></AnimatedPage></Layout>} />
            <Route path="/word-cloud" element={<Layout><AnimatedPage pageKey="word-cloud"><WordCloudPage /></AnimatedPage></Layout>} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
