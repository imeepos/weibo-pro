import type { Meta, StoryObj } from '@storybook/react'
import { Editor, EditorContainer } from '@sker/ui/components/ui/editor'
import { Plate, usePlateEditor  } from 'platejs/react'
import { EditorKit } from '@sker/ui/components/editor/editor-kit';

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
  render: () => {
    const editor = usePlateEditor({
      plugins: EditorKit,
      value: [
        {
          type: 'p',
          children: [{ text: 'Hello World' }],
        },
      ],
    });
    return (
      <Plate editor={editor}>
        <EditorContainer variant="demo">
          <Editor variant="default" placeholder="在此输入内容..." />
        </EditorContainer>
      </Plate>
    )
  },
}

export const WithVariants: Story = {
  render: () => {
    const defaultEditor = usePlateEditor({ plugins: EditorKit })
    const commentEditor = usePlateEditor({ plugins: EditorKit })
    const selectEditor = usePlateEditor({ plugins: EditorKit })

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-medium mb-2">默认样式</h3>
          <Plate editor={defaultEditor}>
            <EditorContainer variant="default">
              <Editor variant="default" placeholder="默认编辑器样式" />
            </EditorContainer>
          </Plate>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">评论样式</h3>
          <Plate editor={commentEditor}>
            <EditorContainer variant="comment">
              <Editor variant="comment" placeholder="评论编辑器样式" />
            </EditorContainer>
          </Plate>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">选择样式</h3>
          <Plate editor={selectEditor}>
            <EditorContainer variant="select">
              <Editor variant="select" placeholder="选择编辑器样式" />
            </EditorContainer>
          </Plate>
        </div>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => {
    const editor = usePlateEditor({ plugins: EditorKit })

    return (
      <Plate editor={editor}>
        <EditorContainer variant="demo">
          <Editor disabled placeholder="禁用状态的编辑器" />
        </EditorContainer>
      </Plate>
    )
  },
}

export const Focused: Story = {
  render: () => {
    const editor = usePlateEditor({ plugins: EditorKit })

    return (
      <Plate editor={editor}>
        <EditorContainer variant="demo">
          <Editor focused placeholder="聚焦状态的编辑器" />
        </EditorContainer>
      </Plate>
    )
  },
}

export const WithRichContent: Story = {
  render: () => {
    const editor = usePlateEditor({
      plugins: EditorKit,
      value: [
        {
          type: 'h1',
          children: [{ text: '富文本编辑器示例' }],
        },
        {
          type: 'p',
          children: [
            { text: '这是一个段落，支持' },
            { text: '粗体', bold: true },
            { text: '、' },
            { text: '斜体', italic: true },
            { text: '、' },
            { text: '删除线', strikethrough: true },
            { text: '等格式。' },
          ],
        },
        {
          type: 'h2',
          children: [{ text: '列表示例' }],
        },
        {
          type: 'ul',
          children: [
            {
              type: 'li',
              children: [{ type: 'lic', children: [{ text: '无序列表项 1' }] }],
            },
            {
              type: 'li',
              children: [{ type: 'lic', children: [{ text: '无序列表项 2' }] }],
            },
            {
              type: 'li',
              children: [{ type: 'lic', children: [{ text: '无序列表项 3' }] }],
            },
          ],
        },
        {
          type: 'h2',
          children: [{ text: '引用块' }],
        },
        {
          type: 'blockquote',
          children: [
            {
              type: 'p',
              children: [{ text: '这是一段引用文字，通常用于引用他人的话或重要内容。' }],
            },
          ],
        },
      ],
    })

    return (
      <Plate editor={editor}>
        <EditorContainer variant="demo">
          <Editor variant="default" />
        </EditorContainer>
      </Plate>
    )
  },
}

export const WithCode: Story = {
  render: () => {
    const editor = usePlateEditor({
      plugins: EditorKit,
      value: [
        {
          type: 'h2',
          children: [{ text: '代码块示例' }],
        },
        {
          type: 'code_block',
          lang: 'typescript',
          children: [
            {
              type: 'code_line',
              children: [{ text: 'function greet(name: string) {' }],
            },
            {
              type: 'code_line',
              children: [{ text: '  return `Hello, ${name}!`;' }],
            },
            {
              type: 'code_line',
              children: [{ text: '}' }],
            },
          ],
        },
        {
          type: 'p',
          children: [
            { text: '行内代码：' },
            { text: 'const x = 42', code: true },
          ],
        },
      ],
    })

    return (
      <Plate editor={editor}>
        <EditorContainer variant="demo">
          <Editor variant="default" />
        </EditorContainer>
      </Plate>
    )
  },
}
