import 'reflect-metadata';
import '@sker/workflow';
import '@sker/workflow-ast';
import '@sker/workflow-browser';
import "@sker/sdk";
// 上面的这些 import 必须要，加上会自动注册响应的controller到root
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import '@sker/ui/globals.css'
import '@sker/workflow-ui/styles'
import { createLogger } from './utils';
import { createAuthClient } from 'better-auth/client';
import { createSkerClientPlugin } from '@sker/sdk';

const logger = createLogger('main');

function getBaseUrl() {
  const url = new URL(window.location.href)
  if (url.protocol.startsWith('https')) {
    return `https://43.240.223.138:18443/api/auth`
  }
  return `http://43.240.223.138:18088/api/auth`
}

const baseURL = getBaseUrl();

// 异步初始化 Better Auth（避免打包时的初始化顺序问题）
(async () => {
  try {
    createAuthClient({
      baseURL,
      plugins: [createSkerClientPlugin()]
    });
    logger.info('Auth client initialized');
  } catch (error) {
    logger.error('Failed to initialize auth client', error);
  }
})();

// Mock服务现在由vite-plugin-mock处理

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Application Error', error);
    logger.debug('Error Info', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              应用程序出现错误
            </h1>
            <p className="text-gray-400 mb-6">
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 渲染应用（缓存 root 实例以避免 HMR 时重复创建）
const rootElement = document.getElementById('root')!;
const rootKey = '__react_root__';

if (!(rootElement as any)[rootKey]) {
  (rootElement as any)[rootKey] = ReactDOM.createRoot(rootElement);
}

const reactRoot = (rootElement as any)[rootKey];
reactRoot.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
