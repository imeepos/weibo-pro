import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useUserDetection } from '@/hooks/useUserDetection';
import { useDebounce } from '@/hooks/useDebounce';
import { UserDetailDialog } from '@/components/common/UserDetailDialog';
import {
  type ForceGraph3DHandle,
  type GraphNode,
  type GraphLink,
  type GraphData,
} from '@sker/ui/components/ui/force-graph-3d';
import type { UserProfile } from '@/types';
import {
  buildGraphData,
  buildNodeLabel,
  createLinkMaterial,
  type GraphConfig,
} from './UserDetection3D.utils';
import { PageHeader, StatsPanel } from './UserDetection3D.parts';
import { GraphStage } from './UserDetection3D.graph';

const UserDetection3D: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [graphConfig, setGraphConfig] = useState<GraphConfig>({
    nodeSize: 1,
    linkDistance: 100,
    chargeStrength: -200,
    showLabels: true,
    autoRotate: false,
  });

  const debouncedSearch = useDebounce(searchTerm, 1000);
  const fgRef = useRef<ForceGraph3DHandle>(null);

  const { users, statistics, isLoading, error, refetch } = useUserDetection({
    timeRange: selectedTimeRange,
    page: 1,
    pageSize: 500,
  });

  const userList = useMemo(() => {
    if (!users) return [];
    return Array.isArray(users) ? users : (users.users || []);
  }, [users]);

  const filteredUsers = useMemo(() => {
    return userList.filter(user => {
      const matchesSearch =
        user.username.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        user.nickname.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesRisk = selectedRiskLevel === 'all' || user.riskLevel === selectedRiskLevel;
      return matchesSearch && matchesRisk;
    });
  }, [userList, debouncedSearch, selectedRiskLevel]);

  const usersByRisk = useMemo(
    () => ({
      high: userList.filter(u => u.riskLevel === 'high').length,
      medium: userList.filter(u => u.riskLevel === 'medium').length,
      low: userList.filter(u => u.riskLevel === 'low').length,
    }),
    [userList]
  );

  const graphData = useMemo(
    (): GraphData => buildGraphData(filteredUsers, graphConfig.nodeSize),
    [filteredUsers, graphConfig.nodeSize]
  );

  const nodeLabel = useCallback(
    (node: GraphNode) => buildNodeLabel(node as any, graphConfig.showLabels),
    [graphConfig.showLabels]
  );

  const linkMaterial = useCallback((link: GraphLink) => createLinkMaterial(link), []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(graphConfig.chargeStrength);
      fgRef.current.d3Force('link').distance(graphConfig.linkDistance);
    }
  }, [graphConfig.chargeStrength, graphConfig.linkDistance]);

  useEffect(() => {
    if (fgRef.current && graphConfig.autoRotate) {
      const interval = setInterval(() => {
        if (fgRef.current) {
          const angle = Date.now() * 0.0001;
          fgRef.current.cameraPosition({
            x: Math.cos(angle) * 500,
            y: 200,
            z: Math.sin(angle) * 500
          });
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [graphConfig.autoRotate]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedUser(node as UserProfile);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) setSelectedUser(null);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* 顶部控制栏 */}
      <PageHeader
        userCount={filteredUsers.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedRiskLevel={selectedRiskLevel}
        onRiskLevelChange={setSelectedRiskLevel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 主要内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 统计卡片区 */}
        <StatsPanel
          totalUsers={userList.length}
          usersByRisk={usersByRisk}
          statistics={statistics}
        />

        {/* 3D 图形区 */}
        <GraphStage
          isLoading={isLoading}
          error={error}
          userCount={filteredUsers.length}
          viewMode={viewMode}
          fgRef={fgRef}
          graphData={graphData}
          nodeLabel={nodeLabel}
          linkMaterial={linkMaterial}
          onNodeClick={handleNodeClick}
          graphConfig={graphConfig}
          onGraphConfigChange={setGraphConfig}
          onRetry={refetch}
        />
      </div>

      {/* 用户详情弹窗 */}
      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={handleDialogClose}
        riskLevelLabels={{
          high: '高风险',
          medium: '中风险',
          low: '低风险',
        }}
      />
    </div>
  );
};

export default UserDetection3D;
