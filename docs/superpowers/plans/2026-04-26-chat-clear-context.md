# Chat 清空上下文实现计划

> **给 agent 执行者：** 必选子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项实现本计划。步骤统一使用 checkbox（`- [ ]`）语法跟踪。

**目标：** 把 `ChatSettings` 里的“清空上下文”按钮接成真实动作，只清空当前激活任务的消息和 session，保留当前 task tab。

**方案概览：** 复用现有 `useChatStore` 中的 `clearMessages(taskId)`，让 `ChatSettings` 读取 `activeTaskId` 并在确认后调用它。测试分两层：组件层锁定按钮接线，页面层锁定消息为空时的空态渲染。

**技术栈：** React 19、Vitest、Testing Library、Zustand

---

## 文件结构

- 新建：`apps/app/src/components/ChatSettings.test.tsx`
  责任：验证设置面板点击确认后会调用 `clearMessages(activeTaskId)`
- 新建：`apps/app/src/pages/ChatPage.test.tsx`
  责任：验证当前任务消息为空时页面显示空态
- 修改：`apps/app/src/components/ChatSettings.tsx`
  责任：把“清空上下文”接到当前激活任务的 `clearMessages`

## 任务 1：接通 ChatSettings 的清空动作

**文件：**
- 新建：`apps/app/src/components/ChatSettings.test.tsx`
- 修改：`apps/app/src/components/ChatSettings.tsx`

- [ ] **步骤 1：先写失败测试**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useChatStore = vi.fn()
const confirmMock = vi.fn()
const clearMessages = vi.fn()
const setPermissionMode = vi.fn()

vi.mock('@/store', () => ({
  useChatStore: () => useChatStore(),
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
    useChatStore.mockReturnValue({
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
    useChatStore.mockReturnValue({
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
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/app exec vitest run src/components/ChatSettings.test.tsx`

预期：FAIL，提示 `clearMessages` 未被调用，或 `useChatStore` 当前没有返回 `activeTaskId/clearMessages`。

- [ ] **步骤 3：编写最小实现**

```tsx
export function ChatSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const { activeTaskId, permissionMode, setPermissionMode, clearMessages } = useChatStore()

  const handleClearContext = () => {
    if (confirm('确定要清空上下文并开始新会话吗？')) {
      if (activeTaskId) {
        clearMessages(activeTaskId)
      }
      setIsOpen(false)
    }
  }

  // 其余 JSX 保持不变
}
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/app exec vitest run src/components/ChatSettings.test.tsx`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add apps/app/src/components/ChatSettings.tsx apps/app/src/components/ChatSettings.test.tsx
git commit -m "feat: wire chat clear context action"
```

## 任务 2：锁定 ChatPage 的空态回归

**文件：**
- 新建：`apps/app/src/pages/ChatPage.test.tsx`

- [ ] **步骤 1：先写失败测试**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const useChatStore = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/store', () => ({
  useChatStore: () => useChatStore(),
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
    useChatStore.mockReturnValue({
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
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/app exec vitest run src/pages/ChatPage.test.tsx`

预期：FAIL，如果当前 mock 结构与真实页面依赖不匹配，先暴露需要补齐的最小依赖面。

- [ ] **步骤 3：编写最小实现**

```tsx
// 这一任务通常不需要修改生产代码。
// 如果测试失败只是因为 mock 缺字段，就补测试；如果页面真实行为与 spec 不符，再回头微调 ChatPage。
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/app exec vitest run src/pages/ChatPage.test.tsx`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add apps/app/src/pages/ChatPage.test.tsx
git commit -m "test: cover empty chat state after clear"
```

## 任务 3：整体验证

**文件：**
- 无新增文件

- [ ] **步骤 1：运行 app 定向测试**

运行：`pnpm --filter @sker/app exec vitest run src/components/ChatSettings.test.tsx src/pages/ChatPage.test.tsx`

预期：PASS

- [ ] **步骤 2：运行已有主线前端回归**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/components/biz/BleMeshNetworkChart.test.tsx src/components/biz/BleMeshTopologyDashboard.test.tsx src/services/api/crawler.test.ts src/pages/CrawlerControl.test.tsx src/components/user-investigation/UserDossierPanel.test.tsx src/pages/UserDetection.investigation.test.tsx`

预期：若环境允许，PASS；若仍遇到既有 `@sker/core` 解析问题，则记录为测试环境限制，不作为本次功能失败。

- [ ] **步骤 3：运行构建**

运行：`pnpm run build`

预期：PASS；允许继续出现 chunk size / turbo 版本 warning，但不能有失败退出码。

- [ ] **步骤 4：提交**

```bash
git add .
git commit -m "test: verify chat clear context flow"
```
