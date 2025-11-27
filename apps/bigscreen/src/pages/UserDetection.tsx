import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  Search,
  AlertTriangle,
  Shield,
  Eye,
  UserCheck,
  Activity,
  MessageSquare,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@sker/core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@sker/ui/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@sker/ui/components/ui/pagination';
import { UserProfile } from '@/types';
import { UsersAPI } from '@/services/api';


const logger = createLogger('UserDetection');

const UserDetection: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [riskLevels, setRiskLevels] = useState<string[]>([]);
  const [riskLevelLabels, setRiskLevelLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersResult, riskLevelsResult] = await Promise.all([
          UsersAPI.getUsersList({ timeRange: selectedTimeRange }),
          UsersAPI.getRiskLevels({ timeRange: selectedTimeRange })
        ]);
        // 转换用户数据格式
        const users = Array.isArray(usersResult) ? usersResult :
                     (usersResult && usersResult.users) ? usersResult.users : [];
        setUsers(users);
        // 保存总用户数
        const total = Array.isArray(usersResult) ? usersResult.length : (usersResult?.total || 0);
        setTotalUsers(total);
        // 转换风险等级数据
        const riskLevelNames = ['all', ...(riskLevelsResult || []).map(level => level.level)];
        setRiskLevels(riskLevelNames);
        const riskLabels: Record<string, string> = { all: '全部' };
        (riskLevelsResult || []).forEach(level => {
          riskLabels[level.level] = level.name;
        });
        setRiskLevelLabels(riskLabels);
      } catch (error) {
        logger.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTimeRange]);

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = selectedRiskLevel === 'all' || user.riskLevel === selectedRiskLevel;
    return matchesSearch && matchesRisk;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // 重置页码当筛选条件变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRiskLevel]);

  const getRiskColor = (level: UserProfile['riskLevel']) => {
    switch (level) {
      case 'high':
        return 'text-red-400 bg-red-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRiskIcon = (level: UserProfile['riskLevel']) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Eye className="w-4 h-4" />;
      case 'low':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 px-4 py-4">
      {/* 页面标题和搜索 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">用户检测面板</h1>
          <p className="text-muted-foreground mt-1">
            当前时间区间: {selectedTimeRange} | 用户行为监测与风险分析
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索用户名或昵称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-muted rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {/* 风险等级筛选 */}
          <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="选择风险等级" />
            </SelectTrigger>
            <SelectContent>
              {(riskLevels.length ? riskLevels : ['all']).map(level => (
                <SelectItem key={level} value={level}>
                  {riskLevelLabels[level as keyof typeof riskLevelLabels] ?? (level === 'all' ? '全部等级' : level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="总用户数"
          className='sentiment-overview-card'
          value={totalUsers}
          change={8.5}
          icon={Users}
          color="blue"
          chartComponent={<MiniTrendChart data={[12, 19, 15, 25, 22, 30, 28]} color="#3b82f6" type="line" />}
        />
        <MetricCard
          title="高风险用户"
          className='sentiment-overview-card'
          value={(users || []).filter(u => u.riskLevel === 'high').length}
          change={-3.2}
          icon={AlertTriangle}
          color="red"
          chartComponent={<MiniTrendChart data={[8, 12, 10, 15, 13, 11, 9]} color="#ef4444" type="bar" />}
        />
        <MetricCard
          title="中风险用户"
          className='sentiment-overview-card'
          value={(users || []).filter(u => u.riskLevel === 'medium').length}
          change={1.8}
          icon={Eye}
          color="yellow"
          chartComponent={<MiniTrendChart data={[15, 18, 16, 20, 19, 22, 21]} color="#eab308" type="line" />}
        />
        <MetricCard
          title="低风险用户"
          className='sentiment-overview-card'
          value={(users || []).filter(u => u.riskLevel === 'low').length}
          change={12.3}
          icon={Shield}
          color="green"
          chartComponent={<MiniTrendChart data={[20, 25, 30, 35, 40, 45, 50]} color="#10b981" type="bar" />}
        />
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 hover:bg-card/90 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedUser(user)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {/* 用户头像 */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.nickname}
                    className="w-12 h-12 rounded-full object-cover border-2 border-border"
                    onError={(e) => {
                      // 头像加载失败时显示默认图标
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center" style={{ display: user.avatar ? 'none' : 'flex' }}>
                  <Users className="w-6 h-6 icon-on-colored-bg" />
                </div>
                
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
                {/* 风险等级 */}
                <div className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                  getRiskColor(user.riskLevel)
                )}>
                  {getRiskIcon(user.riskLevel)}
                  <span>{riskLevelLabels[user.riskLevel]}</span>
                </div>
                
                {/* 情感倾向 */}
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
          ))}
        </div>
      )}

      {/* 分页组件 */}
      {filteredUsers.length > 0 && totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* 用户详情对话框 */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* 基本信息卡片 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    {selectedUser.avatar ? (
                      <img
                        src={selectedUser.avatar}
                        alt={selectedUser.nickname}
                        className="w-16 h-16 rounded-full object-cover border-2 border-border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center" style={{ display: selectedUser.avatar ? 'none' : 'flex' }}>
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-bold text-foreground">{selectedUser.nickname}</h3>
                        {selectedUser.verified && <UserCheck className="w-5 h-5 text-blue-400" />}
                      </div>
                      <p className="text-muted-foreground">@{selectedUser.username}</p>
                      <p className="text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {selectedUser.location}
                      </p>
                    </div>
                    <div className={cn(
                      'flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium',
                      getRiskColor(selectedUser.riskLevel)
                    )}>
                      {getRiskIcon(selectedUser.riskLevel)}
                      <span>{riskLevelLabels[selectedUser.riskLevel]}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 统计数据卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>统计数据</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">粉丝数量</div>
                      <div className="text-2xl font-bold text-foreground">{formatNumber(selectedUser.followers)}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">关注数量</div>
                      <div className="text-2xl font-bold text-foreground">{formatNumber(selectedUser.following)}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">发布贴子</div>
                      <div className="text-2xl font-bold text-foreground">{formatNumber(selectedUser.posts)}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">活跃度</div>
                      <div className="text-2xl font-bold text-foreground">
                        {formatNumber(selectedUser.activities.posts + selectedUser.activities.comments)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 情感分析卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>情感分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-success font-medium">正面情绪</span>
                      <span className="text-foreground font-bold">{selectedUser.sentiment.positive}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-destructive font-medium">负面情绪</span>
                      <span className="text-foreground font-bold">{selectedUser.sentiment.negative}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">中性情绪</span>
                      <span className="text-foreground font-bold">{selectedUser.sentiment.neutral}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 用户标签卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>用户标签</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDetection;
