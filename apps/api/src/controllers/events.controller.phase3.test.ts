import { describe, expect, it } from 'vitest';
import { EventsController } from './events.controller';

describe('Phase 3 events controller contracts', () => {
  it('exposes opinion and sentiment detail methods', () => {
    const prototype = EventsController.prototype as unknown as Record<string, unknown>;

    expect(typeof prototype.getEventOpinionClusters).toBe('function');
    expect(typeof prototype.getEventEmotionMap).toBe('function');
    expect(typeof prototype.getEventUserEmotionInsights).toBe('function');
    expect(typeof prototype.getEventSentimentTrendDetailed).toBe('function');
  });
});
