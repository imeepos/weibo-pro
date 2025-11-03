import 'reflect-metadata'
import '@xyflow/react/dist/style.css'
import '@sker/workflow'
import '@sker/workflow-ui/styles'
import './index.css'
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
