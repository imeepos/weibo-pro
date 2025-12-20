import React from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  Activity,
  MessageSquare,
  Clock,
  MapPin,
} from 'lucide-react';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { getRiskColor, getRiskIcon } from '@/utils/userUtils';
import { UserAvatar } from './UserAvatar';
import type { UserProfile } from '@/types';

interface UserCardProps {
  user: UserProfile;
  riskLevelLabels: Record<string, string>;
  onClick: (user: UserProfile) => void;
  index?: number;
}

export const UserCard = React.memo<UserCardProps>(({ user, riskLevelLabels, onClick, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-6 hover:bg-card/90 transition-all duration-300 cursor-pointer"
      onClick={() => onClick(user)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <UserAvatar user={user} size="sm" />

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground">{user.nickname}</h3>
              <span className="text-muted-foreground">@{user.username}</span>
              {user.verified && (
                <UserCheck className="w-4 h-4 text-blue-400" />
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              <span>{formatNumber(user.followers)} 粉丝</span>
              <span>{formatNumber(user.following)} 关注</span>
              <span>{formatNumber(user.posts)} 贴子</span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{user.location}</span>
              </span>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user.activities.posts}</span>
                <span className="text-muted-foreground">发布</span>
              </div>

              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user.activities.comments}</span>
                <span className="text-muted-foreground">评论</span>
              </div>

              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{formatRelativeTime(user.lastActive)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {user.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={cn(
            'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
            getRiskColor(user.riskLevel)
          )}>
            {getRiskIcon(user.riskLevel)}
            <span>{riskLevelLabels[user.riskLevel]}</span>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">情感倾向</div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-success">{user.sentiment.positive}%</span>
              <span className="text-destructive">{user.sentiment.negative}%</span>
              <span className="text-muted-foreground">{user.sentiment.neutral}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

UserCard.displayName = 'UserCard';
