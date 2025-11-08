import { Injectable, Inject } from '@sker/core';
import type {
  EventWithCategory,
  EventStatistics,
  EventTimelineNode,
  EventKeyNode,
  EventDevelopmentPhase,
  EventDevelopmentPattern,
  EventSuccessFactor,
  TimeRange,
} from './types';
import {
  HOTNESS_THRESHOLD,
  IMPACT_THRESHOLD,
  DEVELOPMENT_PHASES,
  SPREAD_SPEED_THRESHOLD,
  DURATION_THRESHOLD,
  SUCCESS_FACTORS,
} from './constants';

@Injectable({ providedIn: 'root' })
export class EventTimelineBuilder {
  buildTimeline(
    event: EventWithCategory,
    statistics: EventStatistics[]
  ): EventTimelineNode[] {
    const timeline: EventTimelineNode[] = [];
    const startTime = event.occurred_at || event.created_at;

    timeline.push({
      time: startTime.toISOString(),
      event: '事件开始',
      type: 'start',
      impact: 60,
      description: `${event.title}事件开始发酵`,
      metrics: {
        posts: statistics[statistics.length - 1]?.post_count || 100,
        users: statistics[statistics.length - 1]?.user_count || 50,
        sentiment: 0.5,
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
            impact: 95,
            description: '事件达到传播高峰,引发广泛讨论',
            metrics: {
              posts: peakStat.post_count,
              users: peakStat.user_count,
              sentiment: peakStat.sentiment?.positive || 0.6,
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
          impact: 75,
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
        impact: 40,
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

  buildDevelopmentPhases(
    event: EventWithCategory,
    statistics: EventStatistics[]
  ): EventDevelopmentPhase[] {
    const phases: EventDevelopmentPhase[] = [];
    const totalStats = statistics.length;

    if (totalStats > 0) {
      const earlyStats = statistics.slice(-Math.ceil(totalStats * 0.3));
      const avgHotness =
        earlyStats.reduce((sum, s) => sum + s.hotness, 0) / earlyStats.length;

      const firstStat = earlyStats[earlyStats.length - 1];
      const lastStat = earlyStats[0];
      if (firstStat && lastStat) {
        phases.push({
          phase: DEVELOPMENT_PHASES.EARLY.name,
          timeRange: `${this.formatDate(firstStat.snapshot_at)} - ${this.formatDate(lastStat.snapshot_at)}`,
          description: DEVELOPMENT_PHASES.EARLY.description,
          keyEvents: [...DEVELOPMENT_PHASES.EARLY.keyEvents],
          keyTasks: [...DEVELOPMENT_PHASES.EARLY.keyTasks],
          keyMeasures: [...DEVELOPMENT_PHASES.EARLY.keyMeasures],
          metrics: {
            hotness: Math.round(avgHotness),
            posts: lastStat.post_count || 0,
            users: lastStat.user_count || 0,
            sentiment: lastStat.sentiment?.positive || 0.5,
          },
          status: 'completed',
        });
      }
    }

    if (totalStats > 3) {
      const midStats = statistics.slice(
        Math.floor(totalStats * 0.3),
        Math.floor(totalStats * 0.7)
      );
      const avgHotness =
        midStats.reduce((sum, s) => sum + s.hotness, 0) / midStats.length;

      const firstMidStat = midStats[midStats.length - 1];
      const lastMidStat = midStats[0];
      if (firstMidStat && lastMidStat) {
        phases.push({
          phase: DEVELOPMENT_PHASES.OUTBREAK.name,
          timeRange: `${this.formatDate(firstMidStat.snapshot_at)} - ${this.formatDate(lastMidStat.snapshot_at)}`,
          description: DEVELOPMENT_PHASES.OUTBREAK.description,
          keyEvents: [...DEVELOPMENT_PHASES.OUTBREAK.keyEvents],
          keyTasks: [...DEVELOPMENT_PHASES.OUTBREAK.keyTasks],
          keyMeasures: [...DEVELOPMENT_PHASES.OUTBREAK.keyMeasures],
          metrics: {
            hotness: Math.round(avgHotness),
            posts: lastMidStat.post_count || 0,
            users: lastMidStat.user_count || 0,
            sentiment: lastMidStat.sentiment?.positive || 0.5,
          },
          status: totalStats <= 5 ? 'ongoing' : 'completed',
        });
      }
    }

    if (totalStats > 5) {
      const lateStats = statistics.slice(0, Math.ceil(totalStats * 0.3));
      const avgHotness =
        lateStats.reduce((sum, s) => sum + s.hotness, 0) / lateStats.length;

      const firstLateStat = lateStats[lateStats.length - 1];
      const lastLateStat = lateStats[0];
      if (firstLateStat && lastLateStat) {
        phases.push({
          phase: DEVELOPMENT_PHASES.STABLE.name,
          timeRange: `${this.formatDate(firstLateStat.snapshot_at)} - ${this.formatDate(lastLateStat.snapshot_at)}`,
          description: DEVELOPMENT_PHASES.STABLE.description,
          keyEvents: [...DEVELOPMENT_PHASES.STABLE.keyEvents],
          keyTasks: [...DEVELOPMENT_PHASES.STABLE.keyTasks],
          keyMeasures: [...DEVELOPMENT_PHASES.STABLE.keyMeasures],
          metrics: {
            hotness: Math.round(avgHotness),
            posts: lastLateStat.post_count || 0,
            users: lastLateStat.user_count || 0,
            sentiment: lastLateStat.sentiment?.positive || 0.5,
          },
          status: 'ongoing',
        });
      }
    }

    return phases;
  }

  buildDevelopmentPattern(
    event: EventWithCategory,
    statistics: EventStatistics[]
  ): EventDevelopmentPattern {
    const totalDuration = statistics.length;
    const peakHotness = Math.max(...statistics.map((s) => s.hotness));
    const spreadSpeed =
      peakHotness / (statistics.findIndex((s) => s.hotness === peakHotness) + 1);

    return {
      outbreakSpeed:
        spreadSpeed > SPREAD_SPEED_THRESHOLD.FAST
          ? '快速'
          : spreadSpeed > SPREAD_SPEED_THRESHOLD.MEDIUM
            ? '中速'
            : '缓慢',
      propagationScope:
        event.hotness >= HOTNESS_THRESHOLD.VERY_HIGH
          ? '广泛'
          : event.hotness >= HOTNESS_THRESHOLD.HIGH
            ? '较广'
            : '有限',
      duration:
        totalDuration >= DURATION_THRESHOLD.LONG
          ? '长期'
          : totalDuration >= DURATION_THRESHOLD.MEDIUM
            ? '中期'
            : '短期',
      impactDepth:
        peakHotness >= 90 ? '深度' : peakHotness >= 60 ? '中度' : '浅层',
    };
  }

  buildSuccessFactors(event: EventWithCategory): EventSuccessFactor[] {
    const factors: EventSuccessFactor[] = [
      SUCCESS_FACTORS.TOPIC_SENSITIVITY,
      SUCCESS_FACTORS.TIMING,
      SUCCESS_FACTORS.INFLUENCE,
    ];

    if (event.hotness >= HOTNESS_THRESHOLD.VERY_HIGH) {
      factors.push(SUCCESS_FACTORS.MEDIA_PUSH);
    }

    return factors;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  }
}
