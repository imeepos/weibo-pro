import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Badge } from '@sker/ui/components/ui/badge';
import { formatTokens } from './utils';
import { SUCCESS_THRESHOLD } from './constants';

interface StatsItem {
  name: string;
  count: number;
  tokens: number;
  successRate: number;
}

interface StatsCardProps {
  title: string;
  icon: React.ReactNode;
  items: StatsItem[];
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, icon, items }) => {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{item.name}</span>
                <Badge
                  variant={item.successRate > SUCCESS_THRESHOLD ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {item.successRate}%
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>请求 {item.count}</span>
                <span>Token {formatTokens(item.tokens)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
