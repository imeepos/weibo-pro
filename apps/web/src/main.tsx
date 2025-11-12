import 'reflect-metadata'
import '@sker/workflow'
import '@sker/workflow-ast'
import '@sker/workflow-ui/styles'
import './index.css'
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { root } from '@sker/core'
import { providers } from '@sker/sdk'
import { initializeFrontendExecutors } from '@sker/workflow-ui'

// 初始化 SDK providers
root.set(providers(true))

// 初始化前端执行器系统
initializeFrontendExecutors()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
