'use client'
import React from 'react'
import { MarkdownPlugin } from '@platejs/markdown'
import { Plate, usePlateEditor } from 'platejs/react'
import { Editor, EditorContainer } from './editor'
import { BasicBlocksKit } from '../editor/plugins/basic-blocks-kit'
import { BasicMarksKit } from '../editor/plugins/basic-marks-kit'
import { CodeBlockKit } from '../editor/plugins/code-block-kit'
import { LinkKit } from '../editor/plugins/link-kit'
import { ListKit } from '../editor/plugins/list-kit'
import { TableKit } from '../editor/plugins/table-kit'
import { AutoformatKit } from '../editor/plugins/autoformat-kit'
import { MarkdownKit } from '../editor/plugins/markdown-kit'
import { cn } from '@sker/ui/lib/utils'

const MarkdownEditorKit = [
  ...BasicBlocksKit,
  ...BasicMarksKit,
  ...CodeBlockKit,
  ...LinkKit,
  ...ListKit,
  ...TableKit,
  ...AutoformatKit,
  ...MarkdownKit,
]

export interface MarkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: MarkdownEditorProps) {
  const editor = usePlateEditor({
    plugins: MarkdownEditorKit,
    enabled: true
  })

  // 追踪上一次的值，避免不必要的更新
  const prevValueRef = React.useRef<string | undefined>(undefined)
  // 追踪是否正在内部更新（用户输入）
  const isInternalUpdateRef = React.useRef(false)

  React.useEffect(() => {
    // 如果是内部更新（用户输入导致的），不要重新设置编辑器值
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false
      prevValueRef.current = value
      return
    }

    // 只在值真正从外部改变时才更新编辑器
    if (value !== prevValueRef.current) {
      // 获取编辑器当前的序列化值
      const currentValue = editor.getApi(MarkdownPlugin).markdown.serialize()

      // 如果当前值与新值相同，不需要更新（避免不必要的重新渲染）
      if (currentValue === value) {
        prevValueRef.current = value
        return
      }

      if (value) {
        const nodes = editor.getApi(MarkdownPlugin).markdown.deserialize(value)
        editor.tf.setValue(nodes)
      } else {
        // 清空编辑器
        editor.tf.setValue([{ type: 'p', children: [{ text: '' }] }])
      }

      prevValueRef.current = value
    }
  }, [value, editor])

  return (
    <Plate
      editor={editor}
      onChange={() => {
        // 标记为内部更新
        isInternalUpdateRef.current = true
        onChange?.(editor.getApi(MarkdownPlugin).markdown.serialize())
      }}
    >
      <EditorContainer variant="comment" className={cn('text-foreground',className)}>
        <Editor
          variant="comment"
          placeholder={placeholder}
          disabled={disabled}
        />
      </EditorContainer>
    </Plate>
  )
}
