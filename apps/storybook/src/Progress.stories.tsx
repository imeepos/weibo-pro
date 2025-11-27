import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from '@sker/ui/components/ui/progress'
import { useEffect, useState } from 'react'

const meta = {
  title: '@sker/ui/ui/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Progress value={60} className="w-[300px]" />,
}

export const Zero: Story = {
  render: () => <Progress value={0} className="w-[300px]" />,
}

export const Half: Story = {
  render: () => <Progress value={50} className="w-[300px]" />,
}

export const Complete: Story = {
  render: () => <Progress value={100} className="w-[300px]" />,
}

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(0)
    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 10))
      }, 500)
      return () => clearInterval(timer)
    }, [])
    return <Progress value={progress} className="w-[300px]" />
  },
}
