import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useChatStoreMock, clearMessages, setPermissionMode, confirmMock } = vi.hoisted(() => ({
  useChatStoreMock: vi.fn(),
  clearMessages: vi.fn(),
  setPermissionMode: vi.fn(),
  confirmMock: vi.fn(),
}))

vi.mock('@/store', () => ({
  useChatStore: () => useChatStoreMock(),
}))

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}))

import { ChatSettings } from './ChatSettings'

describe('ChatSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', confirmMock)
    useChatStoreMock.mockReturnValue({
      activeTaskId: 'task-1',
      permissionMode: 'default',
      setPermissionMode,
      clearMessages,
    })
  })

  it('clears the active task after confirmation', () => {
    confirmMock.mockReturnValue(true)
    const { container } = render(<ChatSettings />)

    const openButton = container.querySelector('button')
    fireEvent.click(openButton!)
    fireEvent.click(screen.getByText('清空上下文'))

    expect(clearMessages).toHaveBeenCalledWith('task-1')
  })

  it('does not clear anything when no active task exists', () => {
    confirmMock.mockReturnValue(true)
    useChatStoreMock.mockReturnValue({
      activeTaskId: null,
      permissionMode: 'default',
      setPermissionMode,
      clearMessages,
    })

    const { container } = render(<ChatSettings />)

    const openButton = container.querySelector('button')
    fireEvent.click(openButton!)
    fireEvent.click(screen.getByText('清空上下文'))

    expect(clearMessages).not.toHaveBeenCalled()
  })
})
