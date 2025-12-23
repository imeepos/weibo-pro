import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  Shield,
  Eye,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { formatNumber } from '@/utils';
import { DEFAULT_PAGE_SIZE } from '@/utils/userUtils';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserDetection } from '@/hooks/useUserDetection';
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
import { UserDetectionHeader } from '@/components/common/UserDetectionHeader';
import { UserCard } from '@/components/common/UserCard';
import { UserDetailDialog } from '@/components/common/UserDetailDialog';
import { UserListSkeleton, UserListEmpty, UserListError } from '@/components/common/UserListStates';
import type { UserProfile } from '@/types';

const UserDetection: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { users, riskLevels, statistics, isLoading, error, refetch } = useUserDetection({
    timeRange: selectedTimeRange,
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const riskLevelLabels = useMemo(() => {
    const labels: Record<string, string> = { all: '全部' };
    (riskLevels || []).forEach(level => {
      if (typeof level === 'object' && 'level' in level && 'name' in level) {
        labels[level.level] = level.name;
      }
    });
    return labels;
  }, [riskLevels]);

  const allRiskLevels = useMemo(() => {
    const levels = ['all'];
    (riskLevels || []).forEach(level => {
      if (typeof level === 'object' && 'level' in level) {
        levels.push(level.level);
      }
    });
    return levels;
  }, [riskLevels]);

  const userList = useMemo(() => {
    if (!users) return [];
    return Array.isArray(users) ? users : (users.users || []);
  }, [users]);

  const totalUsers = useMemo(() => {
    if (!users) return 0;
    return Array.isArray(users) ? users.length : (users.total || 0);
  }, [users]);

  const filteredUsers = useMemo(() => {
    return (userList || []).filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           user.nickname.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesRisk = selectedRiskLevel === 'all' || user.riskLevel === selectedRiskLevel;
      return matchesSearch && matchesRisk;
    });
  }, [userList, debouncedSearch, selectedRiskLevel]);

  const totalPages = useMemo(() => {
    if (!users || typeof users === 'undefined') return 1;
    return Array.isArray(users) ? Math.ceil(users.length / DEFAULT_PAGE_SIZE) : (users.totalPages || 1);
  }, [users]);

  const displayUsers = filteredUsers;

  const usersByRisk = useMemo(() => ({
    high: (userList || []).filter(u => u.riskLevel === 'high').length,
    medium: (userList || []).filter(u => u.riskLevel === 'medium').length,
    low: (userList || []).filter(u => u.riskLevel === 'low').length,
  }), [userList]);

  const handleUserClick = useCallback((user: UserProfile) => {
    setSelectedUser(user);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) setSelectedUser(null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleRiskLevelChange = useCallback((value: string) => {
    setSelectedRiskLevel(value);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedRiskLevel]);

  const renderPaginationItems = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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
    });
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-6 px-4 py-4">
      <UserDetectionHeader
        selectedTimeRange={selectedTimeRange}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedRiskLevel={selectedRiskLevel}
        onRiskLevelChange={handleRiskLevelChange}
        riskLevels={allRiskLevels}
        riskLevelLabels={riskLevelLabels}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="总用户数"
          className='sentiment-overview-card'
          value={totalUsers}
          change={statistics?.changes.total}
          icon={Users}
          color="blue"
          chartComponent={<MiniTrendChart data={statistics?.trendData.total || []} color="#3b82f6" type="line" />}
        />
        <MetricCard
          title="高风险用户"
          className='sentiment-overview-card'
          value={usersByRisk.high}
          change={statistics?.changes.highRisk}
          icon={AlertTriangle}
          color="red"
          chartComponent={<MiniTrendChart data={statistics?.trendData.highRisk || []} color="#ef4444" type="bar" />}
        />
        <MetricCard
          title="中风险用户"
          className='sentiment-overview-card'
          value={usersByRisk.medium}
          change={statistics?.changes.mediumRisk}
          icon={Eye}
          color="yellow"
          chartComponent={<MiniTrendChart data={statistics?.trendData.mediumRisk || []} color="#eab308" type="line" />}
        />
        <MetricCard
          title="低风险用户"
          className='sentiment-overview-card'
          value={usersByRisk.low}
          change={statistics?.changes.lowRisk}
          icon={Shield}
          color="green"
          chartComponent={<MiniTrendChart data={statistics?.trendData.lowRisk || []} color="#10b981" type="bar" />}
        />
      </div>

      {isLoading ? (
        <UserListSkeleton />
      ) : error ? (
        <UserListError error={error} onRetry={refetch} />
      ) : displayUsers.length === 0 ? (
        <UserListEmpty searchTerm={debouncedSearch} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayUsers.map((user, index) => (
            <UserCard
              key={user.id}
              user={user}
              riskLevelLabels={riskLevelLabels}
              onClick={handleUserClick}
              index={index}
            />
          ))}
        </div>
      )}

      {displayUsers.length > 0 && totalPages > 1 && (
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

              {renderPaginationItems}

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

      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={handleDialogClose}
        riskLevelLabels={riskLevelLabels}
      />
    </div>
  );
};

export default UserDetection;
