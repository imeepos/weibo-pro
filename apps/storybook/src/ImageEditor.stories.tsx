import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { ImageEditor, type Annotation, type CropArea } from "@sker/ui/components/ui/image-editor"

const meta: Meta<typeof ImageEditor> = {
  title: "UI/ImageEditor",
  component: ImageEditor,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
}

export default meta
type Story = StoryObj<typeof ImageEditor>

const SAMPLE_IMAGE = "https://picsum.photos/800/600"

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          打开图片编辑器
        </button>
        {open && (
          <ImageEditor
            imageUrl={SAMPLE_IMAGE}
            open={open}
            onClose={() => setOpen(false)}
            onSave={(data) => {
              console.log("保存数据:", data)
            }}
          />
        )}
      </>
    )
  },
}

export const WithInitialAnnotations: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    const initialAnnotations: Annotation[] = [
      { type: "rect", x: 100, y: 100, width: 150, height: 100, color: "#ff0000", lineWidth: 3 },
      { type: "circle", x: 300, y: 200, width: 100, height: 100, color: "#ff0000", lineWidth: 3 },
    ]
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          打开（带初始标注）
        </button>
        {open && (
          <ImageEditor
            imageUrl={SAMPLE_IMAGE}
            initialAnnotations={initialAnnotations}
            open={open}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  },
}

export const WithInitialCrop: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    const initialCrop: CropArea = { x: 100, y: 100, width: 400, height: 300, shape: "rect" }
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          打开（带初始裁剪）
        </button>
        {open && (
          <ImageEditor
            imageUrl={SAMPLE_IMAGE}
            initialCrop={initialCrop}
            open={open}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  },
}

export const CircleCrop: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    const initialCrop: CropArea = { x: 200, y: 150, width: 200, height: 200, shape: "circle" }
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          打开（圆形裁剪）
        </button>
        {open && (
          <ImageEditor
            imageUrl={SAMPLE_IMAGE}
            initialCrop={initialCrop}
            open={open}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  },
}
