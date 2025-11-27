"use client"

import { useCallback, useEffect, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical"
import { $setBlocksType } from "@lexical/selection"
import { $createHeadingNode, $createQuoteNode, HeadingTagType } from "@lexical/rich-text"
import { $createParagraphNode } from "lexical"
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  RemoveFormatting,
} from "lucide-react"

import { Button } from "@sker/ui/components/button"
import { Separator } from "@sker/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@sker/ui/components/tooltip"

export function Toolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"))
      setIsItalic(selection.hasFormat("italic"))
      setIsUnderline(selection.hasFormat("underline"))
      setIsStrikethrough(selection.hasFormat("strikethrough"))
    }
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      1
    )
  }, [editor, updateToolbar])

  const formatHeading = (tag: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
        selection.getNodes().forEach((node) => {
          if (node.getType() === "text") {
            node.setFormat(0)
          }
        })
      }
    })
  }

  return (
    <div className="flex items-center gap-1 border-b p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isBold ? "secondary" : "ghost"}
            size="icon"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
          >
            <Bold className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>粗体</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isItalic ? "secondary" : "ghost"}
            size="icon"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
          >
            <Italic className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>斜体</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isUnderline ? "secondary" : "ghost"}
            size="icon"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>下划线</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isStrikethrough ? "secondary" : "ghost"}
            size="icon"
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
            }
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除线</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => formatHeading("h1")}>
            <Heading1 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>标题 1</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => formatHeading("h2")}>
            <Heading2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>标题 2</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => formatHeading("h3")}>
            <Heading3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>标题 3</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={formatQuote}>
            <Quote className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>引用</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={clearFormatting}>
            <RemoveFormatting className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>清除格式</TooltipContent>
      </Tooltip>
    </div>
  )
}
