"use client"

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@udecode/cn";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./dialog";
import { VisuallyHidden } from "./visually-hidden";
import { MaximizeIcon } from "lucide-react";

interface MarkdownViewerProps {
  children: string | string[];
  className?: string;
  showFullscreen?: boolean;
  maxHeight?: string;
}

const cleanMarkdownContent = (content: string): string => {
  // 移除零宽字符和其他不可见字符
  let cleaned = content.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // 移除最外层的 markdown 代码块标记（更宽松的匹配）
  const codeBlockRegex = /^```+\s*(?:markdown|md)?\s*\n?([\s\S]*?)\n?```+\s*$/;
  const match = cleaned.match(codeBlockRegex);

  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // 移除末尾多余的代码块标记和空白
  cleaned = cleaned.replace(/\n*```+\s*$/g, '').trim();

  return cleaned;
};

export function MarkdownViewer({
  children,
  className,
  showFullscreen = false,
  maxHeight
}: MarkdownViewerProps) {
  const rawContent = Array.isArray(children) ? children.join('\n') : children;
  const content = cleanMarkdownContent(rawContent);

  const markdownContent = (
    <div className={cn("prose prose-sm", className)}>
      <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!showFullscreen) {
    return markdownContent;
  }

  return (
    <div className="relative group">
      <div className={cn(maxHeight && `max-h-[${maxHeight}]`)}>
        {markdownContent}
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="absolute top-2 right-2 p-1.5 rounded-xs bg-background/80 hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 border shadow-sm text-foreground"
            title="全屏预览"
          >
            <MaximizeIcon className="size-4" />
          </button>
        </DialogTrigger>
        <DialogContent
          className="p-0 border-0 rounded-none shadow-none [&>button]:fixed [&>button]:top-4 [&>button]:right-4 [&>button]:z-50 [&>button]:bg-black/20 [&>button]:hover:bg-black/40 [&>button]:backdrop-blur-sm [&>button]:opacity-60 [&>button]:hover:opacity-100 [&>button]:rounded-full [&>button]:p-2 [&>button>svg]:text-white"
          style={{
            maxWidth: '100vw',
            width: '100vw',
            height: '100vh',
            maxHeight: '100vh'
          }}
        >
          <VisuallyHidden>
            <DialogTitle>Markdown 预览</DialogTitle>
          </VisuallyHidden>
          <style dangerouslySetInnerHTML={{
            __html: `
            .markdown-fullscreen-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .markdown-fullscreen-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .markdown-fullscreen-scroll::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.5);
              border-radius: 3px;
            }
            .markdown-fullscreen-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 0.7);
            }
          `}} />
          <div
            className="w-full h-full overflow-y-auto markdown-fullscreen-scroll px-4 py-4"
            onContextMenu={(e) => e.stopPropagation()}
          >
            <div className="prose prose-sm max-w-none break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:break-all min-h-full">
              <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
