import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { openDialog, renderDialog } from './dialog.test-helpers'

describe('DialogHeader & DialogTitle & DialogDescription', () => {
  it('应该有正确的 data-slot 属性', async () => {
    const { user } = renderDialog(
      <DialogContent>
        <DialogHeader>
          <DialogTitle>标题</DialogTitle>
          <DialogDescription>描述</DialogDescription>
        </DialogHeader>
      </DialogContent>
    )
    await openDialog(user)

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="dialog-header"]')).toBeInTheDocument()
      expect(document.body.querySelector('[data-slot="dialog-title"]')).toBeInTheDocument()
      expect(document.body.querySelector('[data-slot="dialog-description"]')).toBeInTheDocument()
    })
  })

  it('应该渲染标题和描述文本', async () => {
    const { user } = renderDialog(
      <DialogContent>
        <DialogHeader>
          <DialogTitle>我的标题</DialogTitle>
          <DialogDescription>我的描述</DialogDescription>
        </DialogHeader>
      </DialogContent>
    )
    await openDialog(user)

    await waitFor(() => {
      expect(screen.getByText('我的标题')).toBeInTheDocument()
      expect(screen.getByText('我的描述')).toBeInTheDocument()
    })
  })
})

describe('DialogFooter', () => {
  it('应该有正确的 data-slot 属性', async () => {
    const { user } = renderDialog(
      <DialogContent>
        <p>内容</p>
        <DialogFooter>页脚</DialogFooter>
      </DialogContent>
    )
    await openDialog(user)

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="dialog-footer"]')).toBeInTheDocument()
    })
  })
})

describe('DialogClose', () => {
  it('应该关闭对话框', async () => {
    const { user } = renderDialog(
      <DialogContent>
        <p>内容</p>
        <DialogClose>关闭</DialogClose>
      </DialogContent>
    )

    // 打开
    await openDialog(user)
    await waitFor(() => {
      expect(screen.getByText('内容')).toBeInTheDocument()
    })

    // 关闭
    await user.click(screen.getByText('关闭'))
    await waitFor(() => {
      expect(screen.queryByText('内容')).not.toBeInTheDocument()
    })
  })
})
