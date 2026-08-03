import React from 'react';
import type { EventItem } from '@/types';
import { EventCard } from './EventCard';
import { EmptyState } from './EmptyState';
import type { EditEventDialogApi } from './types';

export interface EventListProps {
  events: EventItem[];
  editDialog: EditEventDialogApi;
  onEventClick: (eventId: string) => void;
}

/** 事件列表：空状态或卡片列表 */
export const EventList: React.FC<EventListProps> = ({ events, editDialog, onEventClick }) => {
  if (events.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          index={index}
          editDialog={editDialog}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  );
};
