import React from 'react';
import { Activity, Filter, RefreshCw, Search } from 'lucide-react';
import { Input } from '@sker/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sker/ui/components/ui/select';
import { Button } from '@sker/ui/components/ui/button';
import { cn } from '@/utils';

export interface EventAnalysisHeaderProps {
  total: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  categories: string[];
  isRefreshing: boolean;
  onRefresh: () => void;
}

/** 页面头部：标题、搜索框、分类筛选、刷新按钮 */
export const EventAnalysisHeader: React.FC<EventAnalysisHeaderProps> = ({
  total,
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onSelectedCategoryChange,
  categories,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">事件分析</h1>
          <p className="text-sm text-muted-foreground">
            共 <span className="text-foreground font-medium">{total}</span> 个事件
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="text"
            placeholder="搜索事件..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-10 w-56 bg-muted/30 border-muted hover:bg-muted/50 focus:bg-muted transition-all"
          />
        </div>

        {/* 分类筛选 */}
        <Select value={selectedCategory} onValueChange={onSelectedCategoryChange}>
          <SelectTrigger className="w-36 bg-muted/30 border-muted hover:bg-muted/50 focus:bg-muted transition-all">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? '全部分类' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 刷新按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-muted/30 border-muted hover:bg-muted/50"
        >
          <RefreshCw className={cn('w-4 h-4 transition-transform', isRefreshing && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
};
