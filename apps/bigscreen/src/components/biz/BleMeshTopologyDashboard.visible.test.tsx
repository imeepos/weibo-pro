import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@/services/api/bleMesh', () => ({
  BLE_MESH_API_AVAILABLE: false,
  BLE_MESH_UNAVAILABLE_MESSAGE: 'BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。',
  BLE_MESH_UNAVAILABLE_GUIDANCE: '要启用该页面，需要补齐 BleMeshController 与 /ble-mesh/* 后端契约。',
}))

vi.mock('@/components/biz/BleMeshNetworkChart', () => ({
  default: () => <div>mesh-chart</div>,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren) => <div {...props}>{children}</div>,
  },
}))

import BleMeshTopologyDashboard from './BleMeshTopologyDashboard'

describe('BleMeshTopologyDashboard', () => {
  it('does not expose unavailable action buttons', () => {
    render(<BleMeshTopologyDashboard />)

    expect(screen.getByText('BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /刷新/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /导出/ })).not.toBeInTheDocument()
  })
})
