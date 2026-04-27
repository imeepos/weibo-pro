import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const { useChatStoreMock, navigateMock } = vi.hoisted(() => ({
  useChatStoreMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/store', () => ({
  useChatStore: () => useChatStoreMock(),
}))

vi.mock('@/components', () => ({
  MessageBubble: () => <div>MessageBubble</div>,
  ChatInput: () => <div>ChatInput</div>,
  ConnectionStatus: () => <div>ConnectionStatus</div>,
  TokenUsage: () => <div>TokenUsage</div>,
  ChatSettings: () => <div>ChatSettings</div>,
  ApprovalDialog: () => <div>ApprovalDialog</div>,
  TaskTabs: () => <div>TaskTabs</div>,
}))

vi.mock('@/components/ui', () => ({
  ScrollArea: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}))

import { ChatPage } from './ChatPage'

describe('ChatPage', () => {
  it('renders the empty conversation state for an active task with no messages', () => {
    useChatStoreMock.mockReturnValue({
      connectionStatus: 'connected',
      clientId: 'client-1',
      tasks: [
        {
          id: 'task-1',
          name: '新任务',
          messages: [],
          isLoading: false,
          tokenUsage: null,
        },
      ],
      activeTaskId: 'task-1',
      error: null,
      pendingApproval: null,
      connect: vi.fn(),
      createTask: vi.fn(),
      switchTask: vi.fn(),
      closeTask: vi.fn(),
      sendMessage: vi.fn(),
      abortTask: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    )

    expect(screen.getByText('开始新的对话')).toBeInTheDocument()
  })
})
