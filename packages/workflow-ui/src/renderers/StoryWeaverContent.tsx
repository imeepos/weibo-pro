import { BookOpenIcon, Sparkles } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useExecutionStore } from '../store/execution.store';
import type { StoryWeaverAst } from '@sker/workflow-ast';
import { NovelReader } from './NovelReader';

export function StoryWeaverContent({ ast }: { ast: StoryWeaverAst }) {
  const streamingData = useExecutionStore((state) => state.streamingData[ast.id]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [prevChapterCount, setPrevChapterCount] = useState(0);

  // 当流式数据清除时，强制重新读取AST数据（触发React重新渲染）
  useEffect(() => {
    if (!streamingData) {
      setRefreshKey(prev => prev + 1);
    }
  }, [streamingData]);

  // 监听章节数量变化，强制更新UI
  useEffect(() => {
    const currentCount = ast.previousChapters?.length || 0;
    if (currentCount !== prevChapterCount) {
      setPrevChapterCount(currentCount);
      setRefreshKey(prev => prev + 1);
    }
  }, [ast.previousChapters?.length, prevChapterCount]);

  // 每次refreshKey变化时都会重新读取最新的chapters
  const chapters = ast.previousChapters || [];
  const hasContent = chapters.length > 0;

  return (
    <div className="px-3 py-2" key={refreshKey}>
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
