import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Minus, Pencil, RefreshCw, X } from 'lucide-react';
import { Badge } from '@sker/ui/components/ui/badge';
import { Button } from '@sker/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sker/ui/components/ui/dialog';
import { cn } from '@/utils';
import type { EventDetailData } from './types';
import type { SentimentConfig, TrendConfig } from './utils';
import type { KeywordEditorReturn } from './useKeywordEditor';

interface EventInfoCardProps {
  eventData: EventDetailData;
  trendConfig: TrendConfig | null;
  sentimentConfig: SentimentConfig | null;
  keywordEditor: KeywordEditorReturn;
}

export function EventInfoCard({ eventData, trendConfig, sentimentConfig, keywordEditor }: EventInfoCardProps) {
  const {
    editingKeywords,
    keywordInput,
    setKeywordInput,
    isSaving,
    editDialogOpen,
    setEditDialogOpen,
    addKeyword,
    removeKeyword,
    handleKeyDown,
    closeEditDialog,
    saveKeywords,
  } = keywordEditor;

  const TrendIcon = trendConfig?.icon || Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-muted/20 border border-border/40"
      onClick={(e) => {
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-transparent pointer-events-none" />
      <div
        className="relative p-5"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h2 className="text-xl font-bold text-foreground truncate">{eventData.title}</h2>
              <Badge variant="secondary" className="text-xs">{eventData.category}</Badge>
              {eventData.hotness >= 90 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  热门
                </Badge>
              )}
              {trendConfig && (
                <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", trendConfig.bg, trendConfig.color)}>
                  <TrendIcon className="w-3.5 h-3.5" />
                  {trendConfig.label}
                </div>
              )}
              <Dialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                  setEditDialogOpen(open);
                }}
                modal={true}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-lg"
                  onPointerDownOutside={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      编辑事件关键字
                    </DialogTitle>
                    <DialogDescription>
                      调整事件的关键字以优化监测和分类效果
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex flex-wrap gap-2 min-h-[80px] p-4 bg-muted/30 rounded-lg border border-border/50">
                      {editingKeywords.length === 0 ? (
                        <div className="flex items-center justify-center w-full text-muted-foreground text-sm">
                          暂无关键字，点击下方添加
                        </div>
                      ) : (
                        editingKeywords.map(keyword => (
                          <span
                            key={keyword}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/15 text-primary text-sm rounded-full font-medium group transition-all hover:bg-primary/20"
                          >
                            #{keyword}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeKeyword(keyword);
                              }}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-primary/30 transition-colors"
                              title="移除关键字"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入新关键字"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={addKeyword}
                          disabled={!keywordInput.trim()}
                          className="shrink-0"
                        >
                          添加
                        </Button>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={closeEditDialog}>
                        取消
                      </Button>
                      <Button
                        type="button"
                        onClick={saveKeywords}
                        disabled={isSaving || editingKeywords.length === 0}
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            保存中...
                          </>
                        ) : (
                          '保存'
                        )}
                      </Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{eventData.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {eventData.keywords.slice(0, 5).map(keyword => (
                <span key={keyword} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  #{keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center w-20 shrink-0">
            <div className="text-4xl font-bold text-foreground">{eventData.hotness}</div>
            <div className="text-xs text-muted-foreground">热度指数</div>
            {sentimentConfig && (
              <div className={cn("text-xs font-medium mt-2", sentimentConfig.color)}>
                {sentimentConfig.label} {sentimentConfig.percent}%
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
