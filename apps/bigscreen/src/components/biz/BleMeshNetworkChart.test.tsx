import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getBleMeshTopologyData,
  getDeviceDetails,
} = vi.hoisted(() => ({
  getBleMeshTopologyData: vi.fn(),
  getDeviceDetails: vi.fn(),
}))

vi.mock('../../services/api/bleMesh', () => ({
  BLE_MESH_API_AVAILABLE: false,
  BLE_MESH_UNAVAILABLE_MESSAGE: 'BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。',
  BLE_MESH_UNAVAILABLE_GUIDANCE: '要启用该页面，需要补齐 BleMeshController 与 /ble-mesh/* 后端契约。',
  getBleMeshTopologyData,
  getDeviceDetails,
}))

vi.mock('@sker/ui/components/ui/network-graph', () => ({
  NetworkGraph: () => <div data-testid="network-graph">NetworkGraph</div>,
}))

vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: ({
    error,
    children,
  }: React.PropsWithChildren<{ error?: string }>) =>
    error ? <div>{error}</div> : <div>{children}</div>,
}))

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}))

import BleMeshNetworkChart from './BleMeshNetworkChart'

describe('BleMeshNetworkChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows unavailable message and skips topology fetch when backend is absent', async () => {
    render(<BleMeshNetworkChart type="reachability" customerId="demo" />)

    await waitFor(() => {
      expect(screen.getByText('BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。')).toBeInTheDocument()
    })

    expect(getBleMeshTopologyData).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '刷新数据' }))

    await waitFor(() => {
      expect(getBleMeshTopologyData).not.toHaveBeenCalled()
    })
  })
})
