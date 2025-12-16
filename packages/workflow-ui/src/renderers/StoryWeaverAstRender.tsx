import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { StoryWeaverAst } from '@sker/workflow-ast';
import { MarkdownViewer } from '@sker/ui/components/ui/markdown-viewer';
import { SimplePagination } from '@sker/ui/components/ui/simple-pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@sker/ui/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@sker/ui/components/ui/command';
import { BookOpenIcon, ListIcon, CheckIcon } from 'lucide-react';
import React, { useState } from 'react';

@Injectable()
export class StoryWeaverAstRender {
  @Render(StoryWeaverAst)
  render(ast: StoryWeaverAst) {
    const chapters = ast.previousChapters || [];
    const hasContent = chapters.length > 0;

    return (
      <div className="px-3 py-2">
        {hasContent ? (
          <NovelReader chapters={chapters} latestChapterNumber={ast.chapterNumber} />
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <BookOpenIcon className="size-4" />
            <span>尚未创作章节</span>
          </div>
        )}
      </div>
    );
  }
}

interface NovelReaderProps {
  chapters: Array<{ chapterNumber: number; title: string; summary: string; content: string }>;
  latestChapterNumber: number;
}

function NovelReader({ chapters, latestChapterNumber }: NovelReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(chapters.length - 1);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const currentChapter = chapters[currentIndex];
  if (!currentChapter) return null;

  const chapterMarkdown = `# 第 ${currentChapter.chapterNumber} 章：${currentChapter.title}

**简介**：${currentChapter.summary}

---

${currentChapter.content}`;

  return (
    <>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpenIcon className="size-4" />
          <span>共 {chapters.length} 章</span>
          {latestChapterNumber > 0 && (
            <span className="text-xs">· 最新：第 {latestChapterNumber} 章</span>
          )}
        </div>

        <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md border bg-background hover:bg-muted transition-colors"
              title="目录"
            >
              <ListIcon className="size-3.5" />
              <span>目录</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle>目录</DialogTitle>
            </DialogHeader>
            <Command className="rounded-none border-0">
              <CommandInput placeholder="搜索章节..." />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>未找到章节</CommandEmpty>
                <CommandGroup>
                  {chapters.map((chapter, index) => (
                    <CommandItem
                      key={chapter.chapterNumber}
                      value={`${chapter.chapterNumber} ${chapter.title}`}
                      onSelect={() => {
                        setCurrentIndex(index);
                        setCatalogOpen(false);
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          第 {chapter.chapterNumber} 章：{chapter.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {chapter.summary}
                        </div>
                      </div>
                      {currentIndex === index && <CheckIcon className="size-4 shrink-0" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-background">
        <div className="prose prose-sm max-w-none p-4 max-h-[500px] overflow-y-auto">
          <MarkdownViewer>{chapterMarkdown}</MarkdownViewer>
        </div>

        <div className="border-t p-3 bg-muted/30">
          <SimplePagination
            currentPage={currentIndex + 1}
            totalPages={chapters.length}
            onPageChange={(page) => setCurrentIndex(page - 1)}
            showInfo={false}
            className="justify-center"
          />
        </div>
      </div>
    </>
  );
}
