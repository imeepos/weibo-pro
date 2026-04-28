import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class UserProfileAggregationService {
  async aggregate(input: {
    dossier: any;
    extractions: Array<{
      postId: string;
      createdAt: string | null;
      normalizedText: string;
      extracted: Record<string, any>;
    }>;
  }): Promise<{
    tree: any[];
    timeline: any[];
    coordinationSignals: any[];
    stats: {
      totalEvents: number;
      totalWarnings: number;
    };
  }> {
    const groupedByEvent = new Map<string, typeof input.extractions>();

    for (const item of input.extractions) {
      const key = item.extracted.eventKey ?? 'unknown-event';
      const bucket = groupedByEvent.get(key) ?? [];
      bucket.push(item);
      groupedByEvent.set(key, bucket);
    }

    const timeline = Array.from(groupedByEvent.values()).map((items) => ({
      bucketStart: items[0]?.createdAt ?? null,
      bucketEnd: items.at(-1)?.createdAt ?? null,
      postCount: items.length,
      sameContentCount:
        new Set(items.map((item) => item.extracted.contentFingerprint)).size === 1
          ? items.length
          : 0,
      eventCount: 1,
    }));

    const coordinationSignals = Array.from(groupedByEvent.entries())
      .filter(
        ([, items]) =>
          items.length >= 2 && items.every((item) => item.extracted.coordinationMarkers?.length),
      )
      .map(([eventKey, items], index) => ({
        id: `signal-${index + 1}`,
        label: '疑似协同传播',
        level: items.length >= 3 ? 'high' : 'medium',
        eventKey,
        timeRange: {
          startAt: items[0]?.createdAt ?? null,
          endAt: items.at(-1)?.createdAt ?? null,
        },
        relatedPostCount: items.length,
        description: `同一事件窗口内发现 ${items.length} 条高同质内容`,
      }));

    const tree = Array.from(groupedByEvent.entries()).map(([eventKey, items], index) => ({
      id: `event-${index + 1}`,
      kind: 'event_cluster' as const,
      label: items[0]?.extracted.eventLabel ?? eventKey,
      description: `${items.length} 条帖子`,
      count: items.length,
      badge: coordinationSignals.find((signal) => signal.eventKey === eventKey) ? '疑似协同' : null,
      timeRange: {
        startAt: items[0]?.createdAt ?? null,
        endAt: items.at(-1)?.createdAt ?? null,
      },
      childrenCount: items.length,
      postIds: items.map((item) => item.postId),
      children: [],
    }));

    return {
      tree,
      timeline,
      coordinationSignals,
      stats: {
        totalEvents: tree.length,
        totalWarnings: 0,
      },
    };
  }
}
