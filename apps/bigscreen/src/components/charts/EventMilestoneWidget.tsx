import React from 'react';
import EventTimelineChart from './EventTimelineChart';

interface EventMilestoneData {
  timestamp: string;
  type: 'heat_spike' | 'sentiment_turn' | 'propagation_peak' | 'official_response' | 'discussion_shift';
  title: string;
  summary: string;
  confidence: number;
  metrics: {
    postCount?: number;
    userCount?: number;
    sentimentShift?: number;
  };
}

export function EventMilestoneWidget({ data }: { data: EventMilestoneData[] }) {
  const timelineData = data.map((item) => {
    const type: 'peak' | 'key_event' | 'milestone' =
      item.type === 'heat_spike'
        ? 'peak'
        : item.type === 'sentiment_turn'
          ? 'key_event'
          : 'milestone';

    return {
    time: item.timestamp,
    event: item.title,
    type,
    impact: Math.round((item.confidence || 0) * 100),
    description: item.summary,
    metrics: {
      posts: item.metrics.postCount,
      users: item.metrics.userCount,
      sentiment: item.metrics.sentimentShift,
    },
  }});

  return <EventTimelineChart data={timelineData} />;
}
