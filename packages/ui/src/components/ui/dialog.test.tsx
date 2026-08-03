import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog'
import { openDialog, renderDialog } from './dialog.test-helpers'

describe('Dialog Components', () => {
  describe('Dialog', () => {
    it('应该渲染为对话框容器', () => {
      render(
        <Dialog>
          <DialogTrigger>打开</DialogTrigger>
          <DialogContent>
            <DialogTitle>标题</DialogTitle>
          </DialogContent>
        </Dialog>
      )
      // Dialog 本身不渲染 DOM 元素，只提供上下文
      expect(screen.getByText('打开')).toBeInTheDocument()
    })

    it('应该默认不显示内容', () => {
      const { container: _container } = render(
        <Dialog>
          <DialogTrigger>打开</DialogTrigger>
          <DialogContent>对话框内容</DialogContent>
        </Dialog>
      )
      expect(screen.queryByText('对话框内容')).not.toBeInTheDocument()
    })

    it('点击触发器应该打开对话框', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger>打开</DialogTrigger>
          <DialogContent>
            <DialogTitle>对话框标题</DialogTitle>
            <p>对话框内容</p>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByText('打开')
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('对话框标题')).toBeInTheDocument()
        expect(screen.getByText('对话框内容')).toBeInTheDocument()
      })
    })
  })

  describe('DialogTrigger', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <Dialog>
          <DialogTrigger>打开</DialogTrigger>
        </Dialog>
      )
      expect(container.querySelector('[data-slot="dialog-trigger"]')).toBeInTheDocument()
    })

    it('应该可被点击', async () => {
      const { user } = renderDialog(
        <DialogContent>
          <p>内容</p>
        </DialogContent>,
        '打开对话框'
      )
      await openDialog(user, '打开对话框')

      await waitFor(() => {
        expect(screen.getByText('内容')).toBeInTheDocument()
      })
    })
  })

  describe('完整对话框', () => {
    it('应该支持完整的对话框工作流程', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(
        <Dialog>
          <DialogTrigger>打开对话框</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认操作</DialogTitle>
              <DialogDescription>你确定要删除这个项目吗？</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>取消</DialogClose>
              <button onClick={onClose}>确认</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      // 打开对话框
      await user.click(screen.getByText('打开对话框'))

      await waitFor(() => {
        expect(screen.getByText('确认操作')).toBeInTheDocument()
        expect(screen.getByText('你确定要删除这个项目吗？')).toBeInTheDocument()
      })

      // 点击确认按钮
      await user.click(screen.getByText('确认'))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })
})
