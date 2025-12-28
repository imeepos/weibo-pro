import 'reflect-metadata';
import '@sker/sdk';
// 上面的这些 import 必须要，加上会自动注册响应的controller到root
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/sdk';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
