import React from 'react';
import { UserCheck, MapPin } from 'lucide-react';
import { cn, formatNumber } from '@/utils';
import { getRiskColor, getRiskIcon } from '@/utils/userUtils';
import { UserAvatar } from './UserAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@sker/ui/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import type { UserProfile } from '@/types';

interface UserDetailDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskLevelLabels: Record<string, string>;
}

export const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  user,
  open,
  onOpenChange,
  riskLevelLabels,
}) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>用户详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <UserAvatar user={user} size="md" />

                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-foreground">{user.nickname}</h3>
                    {user.verified && <UserCheck className="w-5 h-5 text-blue-400" />}
                  </div>
                  <p className="text-muted-foreground">@{user.username}</p>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {user.location}
                  </p>
                </div>

                <div className={cn(
                  'flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium',
                  getRiskColor(user.riskLevel)
                )}>
                  {getRiskIcon(user.riskLevel)}
                  <span>{riskLevelLabels[user.riskLevel]}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>统计数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">粉丝数量</div>
                  <div className="text-2xl font-bold text-foreground">{formatNumber(user.followers)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">关注数量</div>
                  <div className="text-2xl font-bold text-foreground">{formatNumber(user.following)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">发布贴子</div>
                  <div className="text-2xl font-bold text-foreground">{formatNumber(user.posts)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">活跃度</div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(user.activities.posts + user.activities.comments)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>情感分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-success font-medium">正面情绪</span>
                  <span className="text-foreground font-bold">{user.sentiment.positive}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-destructive font-medium">负面情绪</span>
                  <span className="text-foreground font-bold">{user.sentiment.negative}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">中性情绪</span>
                  <span className="text-foreground font-bold">{user.sentiment.neutral}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>用户标签</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
