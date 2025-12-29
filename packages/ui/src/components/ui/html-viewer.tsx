"use client"

import React, { useEffect, useRef } from "react";
import { cn } from "@udecode/cn";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./dialog";
import { VisuallyHidden } from "./visually-hidden";
import { MaximizeIcon } from "lucide-react";

interface HtmlViewerProps {
  children: string;
  className?: string;
  showFullscreen?: boolean;
  maxHeight?: string;
}

function HtmlIframe({ html, className }: { html: string; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
    doc.close();

    const resizeObserver = new ResizeObserver(() => {
      iframe.style.height = doc.body.scrollHeight + 'px';
    });
    resizeObserver.observe(doc.body);

    return () => resizeObserver.disconnect();
  }, [html]);

  return <iframe ref={iframeRef} className={cn("w-full border-0", className)} />;
}

export function HtmlViewer({
  children,
  className,
  showFullscreen = false,
  maxHeight
}: HtmlViewerProps) {
  const htmlContent = <HtmlIframe html={children} className={className} />;

  if (!showFullscreen) {
    return htmlContent;
  }

  return (
    <div className="relative group">
      <div className={cn(maxHeight && `max-h-[${maxHeight}]`, "overflow-hidden")}>
        {htmlContent}
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
            <DialogTitle>HTML 预览</DialogTitle>
          </VisuallyHidden>
          <div className="w-full h-full overflow-y-auto px-4 py-4">
            <HtmlIframe html={children} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
