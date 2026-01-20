import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  Shield,
  Eye,
  Rotate3D,
  Filter,
  Network,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUserDetection } from '@/hooks/useUserDetection';
import { useDebounce } from '@/hooks/useDebounce';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import { UserDetailDialog } from '@/components/common/UserDetailDialog';
import { formatNumber } from '@/utils';
import { DEFAULT_PAGE_SIZE } from '@/utils/userUtils';
import { ForceGraph3D, type ForceGraph3DHandle, type GraphNode, type GraphLink, type GraphData } from '@sker/ui/components/ui/force-graph-3d';
import * as THREE from 'three';
import {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
} from '@sker/ui/components/ui/graph-control-panel';
import { Popover, PopoverTrigger, PopoverContent } from '@sker/ui/components/ui/popover';
import { Button } from '@sker/ui/components/ui/button';
import { Input } from '@sker/ui/components/ui/input';
import { Badge } from '@sker/ui/components/ui/badge';
import type { UserProfile } from '@/types';

interface UserNode extends GraphNode {
  val: number;
  riskLevel: string;
  username: string;
  nickname: string;
  followers: number;
}

const RISK_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#10b981',
};

const RISK_LEVELS = ['high', 'medium', 'low'];

const UserDetection3D: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [graphConfig, setGraphConfig] = useState({
    nodeSize: 1,
    linkDistance: 100,
    chargeStrength: -200,
    showLabels: true,
    autoRotate: false,
  });

  const debouncedSearch = useDebounce(searchTerm, 1000);
  const fgRef = useRef<ForceGraph3DHandle>(null);

  const { users, riskLevels, statistics, isLoading, error, refetch } = useUserDetection({
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

  const graphData = useMemo((): GraphData => {
    const nodes: UserNode[] = filteredUsers.map(user => ({
      id: user.id,
      val: Math.log10(user.followers + 1) * graphConfig.nodeSize,
      riskLevel: user.riskLevel,
      username: user.username,
      nickname: user.nickname,
      followers: user.followers,
      color: RISK_COLORS[user.riskLevel] || '#888888',
    }));

    const links: GraphLink[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = calculateUserSimilarity(
          filteredUsers[i],
          filteredUsers[j]
        );
        if (similarity > 0.3) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: similarity,
          });
        }
      }
    }

    return { nodes, links };
  }, [filteredUsers, graphConfig.nodeSize]);

  const nodeLabel = useCallback(
    (node: GraphNode) => {
      if (!graphConfig.showLabels) return '';
      const userNode = node as UserNode;
      return `
        <div style="
          background: rgba(0,0,0,0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          border-left: 3px solid ${RISK_COLORS[userNode.riskLevel]};
        ">
          <div style="font-weight: 600; margin-bottom: 4px;">${userNode.nickname}</div>
          <div style="font-size: 11px; opacity: 0.8;">@${userNode.username}</div>
          <div style="font-size: 11px; margin-top: 4px;">
            风险: ${userNode.riskLevel === 'high' ? '高' : userNode.riskLevel === 'medium' ? '中' : '低'}
          </div>
        </div>
      `;
    },
    [graphConfig.showLabels]
  );

  const linkMaterial = useCallback(
    (link: GraphLink) =>
      new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: Math.min(link.value || 0, 0.5),
      }),
    []
  );

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

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleRiskLevelChange = useCallback((level: string) => {
    setSelectedRiskLevel(level);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">用户关系网络</h1>
          </div>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
            {filteredUsers.length} 用户
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 w-64 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
            />
          </div>

          {/* 风险筛选 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {selectedRiskLevel === 'all' ? '全部风险' : `${selectedRiskLevel} 风险`}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48">
              <div className="space-y-1">
                <Button
                  variant={selectedRiskLevel === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleRiskLevelChange('all')}
                >
                  全部风险
                </Button>
                {RISK_LEVELS.map(level => (
                  <Button
                    key={level}
                    variant={selectedRiskLevel === level ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleRiskLevelChange(level)}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: RISK_COLORS[level] }}
                    />
                    {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* 视图切换 */}
          <div className="flex bg-white/5 rounded-lg p-1">
            <Button
              variant={viewMode === '3d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('3d')}
              className="gap-2"
            >
              <Rotate3D className="w-4 h-4" />
              3D
            </Button>
            <Button
              variant={viewMode === '2d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('2d')}
            >
              2D
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 统计卡片区 */}
        <div className="w-80 p-4 space-y-4 overflow-y-auto border-r border-white/10">
          <MetricCard
            title="总用户数"
            value={userList.length}
            change={statistics?.changes.total}
            icon={Users}
            color="blue"
            chartComponent={<MiniTrendChart data={statistics?.trendData.total || []} color="#3b82f6" type="line" />}
          />
          <MetricCard
            title="高风险用户"
            value={usersByRisk.high}
            change={statistics?.changes.highRisk}
            icon={AlertTriangle}
            color="red"
            chartComponent={<MiniTrendChart data={statistics?.trendData.highRisk || []} color="#ef4444" type="bar" />}
          />
          <MetricCard
            title="中风险用户"
            value={usersByRisk.medium}
            change={statistics?.changes.mediumRisk}
            icon={Eye}
            color="yellow"
            chartComponent={<MiniTrendChart data={statistics?.trendData.mediumRisk || []} color="#eab308" type="line" />}
          />
          <MetricCard
            title="低风险用户"
            value={usersByRisk.low}
            change={statistics?.changes.lowRisk}
            icon={Shield}
            color="green"
            chartComponent={<MiniTrendChart data={statistics?.trendData.lowRisk || []} color="#10b981" type="bar" />}
          />

          {/* 图例 */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="text-sm font-medium text-white mb-3">风险等级</h3>
            <div className="space-y-2">
              {RISK_LEVELS.map(level => (
                <div key={level} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3D 图形区 */}
        {viewMode === '3d' ? (
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-red-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  <p>{error.message}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    重试
                  </Button>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>未找到匹配的用户</p>
                </div>
              </div>
            ) : (
              <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeAutoColorBy="riskLevel"
                nodeLabel={nodeLabel}
                linkMaterial={linkMaterial}
                linkWidth={link => Math.max(0.5, link.value * 3)}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeClick={handleNodeClick}
                backgroundColor="rgba(0, 0, 0, 0)"
                showNavInfo={false}
                controlType="orbit"
                enableNodeDrag={true}
                enableNavigationControls={true}
                enablePointerInteraction={true}
                warmupTicks={50}
                cooldownTicks={100}
              />
            )}

            {/* 3D 控制面板 */}
            {viewMode === '3d' && !isLoading && !error && filteredUsers.length > 0 && (
              <GraphControlPanel title="图形设置" position="bottom-right">
                <ControlGroup title="节点和连线">
                  <SliderControl
                    label="节点大小"
                    value={graphConfig.nodeSize * 100}
                    min={10}
                    max={300}
                    suffix="%"
                    onValueChange={v => setGraphConfig(prev => ({ ...prev, nodeSize: v / 100 }))}
                  />
                  <SliderControl
                    label="连线距离"
                    value={graphConfig.linkDistance}
                    min={50}
                    max={300}
                    onValueChange={v => setGraphConfig(prev => ({ ...prev, linkDistance: v }))}
                  />
                  <SliderControl
                    label="斥力强度"
                    value={Math.abs(graphConfig.chargeStrength)}
                    min={50}
                    max={500}
                    onValueChange={v =>
                      setGraphConfig(prev => ({ ...prev, chargeStrength: -v }))
                    }
                  />
                </ControlGroup>
                <ControlGroup title="显示选项">
                  <SwitchControl
                    label="显示标签"
                    checked={graphConfig.showLabels}
                    onCheckedChange={v => setGraphConfig(prev => ({ ...prev, showLabels: v }))}
                  />
                  <SwitchControl
                    label="自动旋转"
                    checked={graphConfig.autoRotate}
                    onCheckedChange={v => setGraphConfig(prev => ({ ...prev, autoRotate: v }))}
                  />
                </ControlGroup>
              </GraphControlPanel>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            2D 视图开发中...
          </div>
        )}
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

function calculateUserSimilarity(user1: UserProfile, user2: UserProfile): number {
  let score = 0;
  let factors = 0;

  if (user1.riskLevel === user2.riskLevel) {
    score += 0.4;
  }
  factors++;

  const locationMatch = user1.location && user2.location && user1.location === user2.location;
  if (locationMatch) {
    score += 0.3;
  }
  factors++;

  const tagOverlap =
    user1.tags.filter(tag => user2.tags.includes(tag)).length /
    Math.max(user1.tags.length, user2.tags.length, 1);
  score += tagOverlap * 0.3;
  factors++;

  const followersDiff =
    Math.abs(user1.followers - user2.followers) /
    (user1.followers + user2.followers + 1);
  score += (1 - followersDiff) * 0.2;
  factors++;

  return score / factors;
}

export default UserDetection3D;
