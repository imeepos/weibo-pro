import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { StoryWeaverAst } from '@sker/workflow-ast';
import { Dialog, DialogContent, DialogTrigger } from '@sker/ui/components/ui/dialog';
import { ScrollArea } from '@sker/ui/components/ui/scroll-area';
import { BookOpenIcon, MaximizeIcon, ChevronLeftIcon, ChevronRightIcon, Sparkles } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@sker/ui/lib/utils';
import { useExecutionStore } from '../store/execution.store';

@Injectable()
export class StoryWeaverAstRender {
  @Render(StoryWeaverAst)
  render(ast: StoryWeaverAst) {
    return <StoryWeaverContent ast={ast} />;
  }
}

function StoryWeaverContent({ ast }: { ast: StoryWeaverAst }) {
  const streamingData = useExecutionStore((state) => state.streamingData[ast.id]);
  const chapters = ast.previousChapters || [];
  const hasContent = chapters.length > 0;

  return (
    <div className="px-3 py-2">
      {streamingData && (
        <StreamingPreview
          accumulated={streamingData.accumulated}
          chapterNumber={ast.chapterNumber || chapters.length + 1}
        />
      )}
      {hasContent && !streamingData && (
        <NovelReader chapters={chapters} latestChapterNumber={ast.chapterNumber} />
      )}
      {!hasContent && !streamingData && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <BookOpenIcon className="size-4" />
          <span>尚未创作章节</span>
        </div>
      )}
    </div>
  );
}

interface StreamingPreviewProps {
  accumulated: string;
  chapterNumber: number;
}

function StreamingPreview({ accumulated, chapterNumber }: StreamingPreviewProps) {
  const [shouldScroll, setShouldScroll] = useState(true);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldScroll && contentRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
      const isNearBottom = scrollHeight - clientHeight - scrollTop < 100;
      if (isNearBottom) {
        contentRef.current.scrollTop = scrollHeight;
      }
    }
  }, [accumulated, shouldScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, clientHeight, scrollTop } = e.currentTarget;
    const isNearBottom = scrollHeight - clientHeight - scrollTop < 50;
    setShouldScroll(isNearBottom);
  };

  return (
    <div className="relative border rounded-lg bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b">
        <Sparkles className="size-4 text-primary animate-pulse" />
        <span className="text-sm font-medium">正在创作第 {chapterNumber} 章...</span>
      </div>
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="p-4 max-h-96 overflow-y-auto prose prose-sm max-w-none"
      >
        <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>
          {accumulated}
        </ReactMarkdown>
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
      </div>
    </div>
  );
}

interface NovelReaderProps {
  chapters: Array<{ chapterNumber: number; title: string; summary: string; content: string }>;
  latestChapterNumber: number;
}

function NovelReader({ chapters, latestChapterNumber }: NovelReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(chapters.length - 1);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const currentChapter = chapters[currentIndex];
  if (!currentChapter) return null;

  return (
    <>
      <div className="relative group">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenIcon className="size-4" />
            <span>共 {chapters.length} 章</span>
            {latestChapterNumber > 0 && (
              <span className="text-xs">· 最新：第 {latestChapterNumber} 章</span>
            )}
          </div>
        </div>
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogTrigger asChild>
            <button
              className="absolute text-foreground top-2 right-2 p-1.5 rounded-xs border shadow-sm"
              title="全屏阅读"
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
            <FullscreenReader
              chapters={chapters}
              currentIndex={currentIndex}
              onChapterChange={setCurrentIndex}
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

interface FullscreenReaderProps {
  chapters: Array<{ chapterNumber: number; title: string; summary: string; content: string }>;
  currentIndex: number;
  onChapterChange: (index: number) => void;
}

function FullscreenReader({ chapters, currentIndex, onChapterChange }: FullscreenReaderProps) {
  const currentChapter = chapters[currentIndex];

  if (!currentChapter) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < chapters.length - 1;

  const goToPrev = () => hasPrev && onChapterChange(currentIndex - 1);
  const goToNext = () => hasNext && onChapterChange(currentIndex + 1);

  const chapterMarkdown = `# ${currentChapter.title}

**简介**：${currentChapter.summary}

---

${currentChapter.content}`;

  return (
    <div className="w-full h-full flex bg-background">
      {/* 左侧章节目录 */}
      <div className="w-64 h-full border-r bg-muted/20 flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b bg-background/50 backdrop-blur-sm">
          <h3 className="font-semibold">目录</h3>
          <p className="text-xs text-muted-foreground mt-1">共 {chapters.length} 章</p>
        </div>

        {/* relative + absolute + ScrollArea 方案 */}
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {chapters.map((chapter, index) => (
                  <button
                    key={chapter.chapterNumber}
                    onClick={() => onChapterChange(index)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      index === currentIndex
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="truncate">{chapter.title}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* 右侧阅读区域 */}
      <div className="flex-1 relative group">
        {/* relative + absolute + ScrollArea 方案 */}
        <div className="absolute inset-0">
          <ScrollArea className="h-full">
            <div className="px-16 py-8">
              <div className="max-w-3xl mx-auto prose prose-sm break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:break-all">
                <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>
                  {chapterMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* 左侧悬浮按钮 - 上一章 */}
        {hasPrev && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 hover:bg-muted border shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            title="上一章"
          >
            <ChevronLeftIcon className="size-6" />
          </button>
        )}

        {/* 右侧悬浮按钮 - 下一章 */}
        {hasNext && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 hover:bg-muted border shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            title="下一章"
          >
            <ChevronRightIcon className="size-6" />
          </button>
        )}

        {/* 底部章节导航提示 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          第 {currentChapter.chapterNumber} 章 / 共 {chapters.length} 章
        </div>
      </div>
    </div>
  );
}
