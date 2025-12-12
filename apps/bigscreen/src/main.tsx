import 'reflect-metadata';
import '@sker/workflow';
import '@sker/workflow-ast';
import '@sker/workflow-browser';
import React from 'react';
import ReactDOM from 'react-dom/client';
import "@sker/sdk";
import { providers } from '@sker/sdk'
import { root } from '@sker/core'

import App from './App';
import '@sker/ui/globals.css'
import '@sker/workflow-ui/styles'
import { createLogger } from './utils';

const logger = createLogger('main');

function getBaseUrl() {
  const url = new URL(window.location.href)
  if (url.port) {
    return `${url.protocol}//${url.hostname}:${url.port}`
  }
  return `${url.protocol}//${url.hostname}`
}

const baseURL = getBaseUrl();
const providersArray = providers({ baseURL });
root.set(providersArray);

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

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
