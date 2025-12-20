import React from 'react';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@sker/ui/components/ui/skeleton';

export const UserListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-4 w-96" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface UserListEmptyProps {
  searchTerm?: string;
}

export const UserListEmpty: React.FC<UserListEmptyProps> = ({ searchTerm }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <Users className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {searchTerm ? '未找到匹配用户' : '暂无用户数据'}
      </h3>
      <p className="text-muted-foreground text-center max-w-md">
        {searchTerm
          ? `没有找到与 "${searchTerm}" 相关的用户，请尝试其他搜索条件`
          : '当前时间范围内暂无用户数据，请调整筛选条件或稍后再试'}
      </p>
    </div>
  );
};

interface UserListErrorProps {
  error: Error;
  onRetry: () => void;
}

export const UserListError: React.FC<UserListErrorProps> = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">加载失败</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {error.message || '加载用户数据时发生错误，请稍后重试'}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span>重试</span>
      </button>
    </div>
  );
};
