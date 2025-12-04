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

  React.useEffect(() => {
    if (value) {
      const nodes = editor.getApi(MarkdownPlugin).markdown.deserialize(value)
      editor.tf.setValue(nodes)
    }
  }, [])

  return (
    <Plate
      editor={editor}
      onChange={() => {
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
