import 'reflect-metadata'
import '@sker/workflow'
import '@sker/workflow-ast'
import '@sker/workflow-browser'  // 导入即自动注册
import '@sker/workflow-ui/styles'
import './index.css'
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { root } from '@sker/core'
import { providers } from '@sker/sdk'

// 初始化 SDK providers

function getBaseUrl(){
  const url = new URL(window.location.href)
  if(url.port){
    return `${url.protocol}//${url.hostname}:${url.port}`
  }
  return `${url.protocol}//${url.hostname}`
}

root.set(providers({ baseURL: getBaseUrl() }))

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
