import { describe, expect, it } from 'vitest';
import { EventsController } from './events.controller';

describe('Phase 4 events controller contracts', () => {
  it('exposes user risk profile and abnormal user methods', () => {
    const prototype = EventsController.prototype as unknown as Record<string, unknown>;

    expect(typeof prototype.getEventRiskProfile).toBe('function');
    expect(typeof prototype.getEventAbnormalUsers).toBe('function');
  });
});
