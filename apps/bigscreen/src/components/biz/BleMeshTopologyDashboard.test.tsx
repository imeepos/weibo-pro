import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../services/api/bleMesh', () => ({
  BLE_MESH_API_AVAILABLE: false,
  BLE_MESH_UNAVAILABLE_MESSAGE: 'BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。',
  BLE_MESH_UNAVAILABLE_GUIDANCE: '要启用该页面，需要补齐 BleMeshController 与 /ble-mesh/* 后端契约。',
}))

vi.mock('./BleMeshNetworkChart', () => ({
  default: () => <div data-testid="ble-mesh-network-chart">BleMeshNetworkChart</div>,
}))

import BleMeshTopologyDashboard from './BleMeshTopologyDashboard'

describe('BleMeshTopologyDashboard', () => {
  it('renders an explicit unavailable banner while keeping the page shell', () => {
    render(<BleMeshTopologyDashboard />)

    expect(screen.getByText('蓝牙网格可达性')).toBeInTheDocument()
    expect(screen.getByText('BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。')).toBeInTheDocument()
    expect(screen.getByText('要启用该页面，需要补齐 BleMeshController 与 /ble-mesh/* 后端契约。')).toBeInTheDocument()
    expect(screen.getByTestId('ble-mesh-network-chart')).toBeInTheDocument()
  })
})
