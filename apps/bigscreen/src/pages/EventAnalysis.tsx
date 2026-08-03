import React from 'react';
import { useEventAnalysisData } from './event-analysis/useEventAnalysisData';
import { useEditEventDialog } from './event-analysis/useEditEventDialog';
import { LoadingSkeleton } from './event-analysis/LoadingSkeleton';
import { EventAnalysisHeader } from './event-analysis/EventAnalysisHeader';
import { StatsOverview } from './event-analysis/StatsOverview';
import { EventList } from './event-analysis/EventList';
import { PaginationBar } from './event-analysis/PaginationBar';

const EventAnalysis: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categories,
    events,
    setEvents,
    trendSeries,
    stats,
    loading,
    isRefreshing,
    currentPage,
    setCurrentPage,
    total,
    totalPages,
    loadData,
    handleEventClick,
  } = useEventAnalysisData();

  const editDialog = useEditEventDialog(setEvents);

  // 加载状态
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {/* 页面头部 */}
      <EventAnalysisHeader
        total={total}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onSelectedCategoryChange={setSelectedCategory}
        categories={categories}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
      />

      {/* 统计概览 - 2x2 网格 */}
      <StatsOverview stats={stats} trendSeries={trendSeries} />

      {/* 事件列表 */}
      <EventList
        events={events}
        editDialog={editDialog}
        onEventClick={handleEventClick}
      />

      {/* 分页 */}
      <PaginationBar
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default EventAnalysis;
