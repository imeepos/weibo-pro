import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Editor } from '@sker/ui/components/blocks/editor-00/editor'
import { SerializedEditorState } from 'lexical'

const meta = {
  title: '@sker/ui/blocks/Editor',
  component: Editor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Editor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithOnChange: Story = {
  render: () => {
    const [content, setContent] = useState<SerializedEditorState | null>(null)

    return (
      <div className="space-y-4">
        <Editor onSerializedChange={setContent} />
        {content && (
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-2">编辑器状态：</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  },
}

export const WithInitialContent: Story = {
  args: {
    editorSerializedState: {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '这是预设的初始内容',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    },
  },
}

export const RichContent: Story = {
  args: {
    editorSerializedState: {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '富文本编辑器示例',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag: 'h1',
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '这是一个段落，支持',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 1,
                mode: 'normal',
                style: '',
                text: '粗体',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '、',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 2,
                mode: 'normal',
                style: '',
                text: '斜体',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '、',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 8,
                mode: 'normal',
                style: '',
                text: '删除线',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '等格式。',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '标题层级',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag: 'h2',
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '这是 H3 标题',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag: 'h3',
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '引用块示例',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag: 'h2',
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '这是一段引用文字，通常用于引用他人的话或重要内容。',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'quote',
            version: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '多行文本',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag: 'h2',
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '第一段内容。',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '第二段内容。',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '第三段内容。',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    },
  },
}
