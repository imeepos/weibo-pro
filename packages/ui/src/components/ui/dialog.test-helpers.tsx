import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Dialog, DialogTrigger } from './dialog'

/**
 * 渲染一个带触发器的 Dialog 外壳，返回可复用的 userEvent 实例。
 */
export function renderDialog(children: ReactNode, trigger = '打开') {
  const user = userEvent.setup()
  render(
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      {children}
    </Dialog>
  )
  return { user }
}

/**
 * 点击触发器打开对话框。
 */
export async function openDialog(
  user: ReturnType<typeof userEvent.setup>,
  trigger = '打开'
) {
  await user.click(screen.getByText(trigger))
}
