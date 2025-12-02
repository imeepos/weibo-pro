import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@udecode/cn";

interface MarkdownViewerProps {
  children: string | string[];
  className?: string;
}

export function MarkdownViewer({
  children,
  className
}: MarkdownViewerProps) {
  const content = Array.isArray(children) ? children.join('\n') : children;

  return (
    <div className={cn(
      "prose prose-sm prose-neutral dark:prose-invert max-w-none",
      className
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
