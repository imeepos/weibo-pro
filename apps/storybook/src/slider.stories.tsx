import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Slider } from "@sker/ui/components/ui/slider"

const meta: Meta<typeof Slider> = {
  title: "UI/Slider",
  component: Slider,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = {
  render: () => <Slider defaultValue={[50]} max={100} step={1} className="w-[300px]" />,
}

export const WithRange: Story = {
  render: () => <Slider defaultValue={[25, 75]} max={100} step={1} className="w-[300px]" />,
}

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState([50])
    return (
      <div className="space-y-4 w-[300px]">
        <Slider value={value} onValueChange={setValue} max={100} step={1} />
        <div className="text-sm">当前值: {value[0]}</div>
      </div>
    )
  },
}

export const CustomRange: Story = {
  render: () => (
    <Slider defaultValue={[500]} min={0} max={1000} step={10} className="w-[300px]" />
  ),
}

export const Disabled: Story = {
  render: () => <Slider defaultValue={[50]} max={100} disabled className="w-[300px]" />,
}

export const Vertical: Story = {
  render: () => (
    <Slider
      defaultValue={[50]}
      max={100}
      step={1}
      orientation="vertical"
      className="h-[200px]"
    />
  ),
}

export const MultipleValues: Story = {
  render: () => {
    const [values, setValues] = useState([20, 40, 60, 80])
    return (
      <div className="space-y-4 w-[300px]">
        <Slider value={values} onValueChange={setValues} max={100} step={1} />
        <div className="text-sm">值: {values.join(", ")}</div>
      </div>
    )
  },
}
