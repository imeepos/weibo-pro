import { Injectable, } from '@sker/core';
import type {
  EventWithCategory,
  EventStatistics,
  EventTimelineNode,
  EventKeyNode,
} from './types';
import {
  IMPACT_THRESHOLD,
} from './constants';

@Injectable({ providedIn: 'root' })
export class EventTimelineBuilder {
  buildTimeline(
    event: EventWithCategory,
    statistics: EventStatistics[]
  ): EventTimelineNode[] {
    const timeline: EventTimelineNode[] = [];
    const startTime = event.occurred_at || event.created_at;
    const firstStat = statistics[statistics.length - 1];
    const maxHotness = Math.max(...statistics.map((s) => s.hotness), event.hotness);

    // 基于热度计算影响力：热度/最大热度 * 100
    const calcImpact = (hotness: number) => Math.min(100, Math.round((hotness / Math.max(maxHotness, 1)) * 100));

    timeline.push({
      time: startTime.toISOString(),
      event: '事件开始',
      type: 'start',
      impact: firstStat ? calcImpact(firstStat.hotness) : calcImpact(event.hotness * 0.3),
      description: `${event.title}事件开始发酵`,
      metrics: {
        posts: firstStat?.post_count || 0,
        users: firstStat?.user_count || 0,
        sentiment: firstStat?.sentiment?.positive || 0.5,
      },
    });

    if (statistics.length >= 3) {
      const peakIndex = statistics.findIndex(
        (s, i) =>
          i > 0 &&
          i < statistics.length - 1 &&
          s.hotness >= (statistics[i - 1]?.hotness || 0) &&
          s.hotness >= (statistics[i + 1]?.hotness || 0)
      );

      if (peakIndex >= 0) {
        const peakStat = statistics[peakIndex];
        if (peakStat) {
          timeline.push({
            time: peakStat.snapshot_at.toISOString(),
            event: '热度峰值',
            type: 'peak',
            impact: calcImpact(peakStat.hotness),
            description: '事件达到传播高峰,引发广泛讨论',
            metrics: {
              posts: peakStat.post_count,
              users: peakStat.user_count,
              sentiment: peakStat.sentiment?.positive || 0.5,
            },
          });
        }
      }
    }

    if (statistics.length >= 2) {
      const midStat = statistics[Math.floor(statistics.length / 2)];
      if (midStat) {
        timeline.push({
          time: midStat.snapshot_at.toISOString(),
          event: '关键转折',
          type: 'key_event',
          impact: calcImpact(midStat.hotness),
          description: '事件进入新阶段,舆论方向发生变化',
          metrics: {
            posts: midStat.post_count,
            users: midStat.user_count,
            sentiment: midStat.sentiment?.positive || 0.5,
          },
        });
      }
    }

    const latestStat = statistics[0];
    if (latestStat && latestStat.hotness < event.hotness * 0.7) {
      timeline.push({
        time: latestStat.snapshot_at.toISOString(),
        event: '热度回落',
        type: 'decline',
        impact: calcImpact(latestStat.hotness),
        description: '事件热度逐渐降温,讨论趋于平静',
        metrics: {
          posts: latestStat.post_count,
          users: latestStat.user_count,
          sentiment: latestStat.sentiment?.positive || 0.5,
        },
      });
    }

    return timeline.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }

  buildKeyNodes(timeline: EventTimelineNode[]): EventKeyNode[] {
    return timeline
      .filter((node) => node.type !== 'start')
      .map((node) => ({
        time: node.time,
        description: node.description,
        impact:
          node.impact >= IMPACT_THRESHOLD.HIGH
            ? 'high'
            : node.impact >= IMPACT_THRESHOLD.MEDIUM
              ? 'medium'
              : 'low',
        metrics: node.metrics,
      })) as EventKeyNode[];
  }


  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  }
}
