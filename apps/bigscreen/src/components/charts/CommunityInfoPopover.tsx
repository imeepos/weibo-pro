import React from 'react';
import { Info } from 'lucide-react';
import { GraphFloatingButton } from '@sker/ui/components/ui/graph-floating-button';
import { Popover, PopoverTrigger, PopoverContent } from '@sker/ui/components/ui/popover';
import { InfoGrid, InfoItem, InfoList } from '@sker/ui/components/ui/graph-info-panel';
import type { CommunityMapping } from './NodeShapeUtils';

interface CommunityInfoPopoverProps {
  communityMapping: CommunityMapping;
  interCommunityRelations: any[];
}

/** 社群信息悬浮面板：展示社群统计、详情与社群间连接 */
export const CommunityInfoPopover: React.FC<CommunityInfoPopoverProps> = ({
  communityMapping,
  interCommunityRelations,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <GraphFloatingButton
          position="bottom-left"
          title="显示社群信息"
        >
          <Info className="size-4" />
        </GraphFloatingButton>
      </PopoverTrigger>

      <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="start" side="right" sideOffset={8}>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-2">社群分析</h3>
            <p className="text-sm text-muted-foreground">
              共检测到 <span className="font-semibold text-primary">{communityMapping.communities.length}</span> 个社群
            </p>
          </div>

          <InfoGrid columns={2}>
            <InfoItem
              label="最大社群"
              value={`${communityMapping.communities[0]?.size || 0} 节点`}
              variant="default"
            />
            <InfoItem
              label="平均密度"
              value={`${((communityMapping.communities.reduce((sum, c) => sum + c.density, 0) / communityMapping.communities.length) * 100).toFixed(1)}%`}
              variant="default"
            />
          </InfoGrid>

          <div>
            <h4 className="text-sm font-medium mb-2">社群详情</h4>
            <InfoList
              items={communityMapping.communities.map(c => ({
                id: c.id,
                color: c.color,
                label: `社群 ${c.id}`,
                value: `${c.size} 节点`,
              }))}
              maxItems={10}
            />
          </div>

          {interCommunityRelations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">社群间连接</h4>
              <div className="space-y-1 text-xs">
                {interCommunityRelations.slice(0, 3).map((relation, index) => (
                  <div key={index} className="flex justify-between items-center p-1.5 bg-muted rounded">
                    <span className="text-muted-foreground">
                      社群 {relation.sourceCommunity} ↔ 社群 {relation.targetCommunity}
                    </span>
                    <span className="font-medium">
                      {relation.edgeCount} 连接
                    </span>
                  </div>
                ))}
                {interCommunityRelations.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    还有 {interCommunityRelations.length - 3} 个关系...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CommunityInfoPopover;
