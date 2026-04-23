import { describe, expect, it } from 'vitest';
import { EventsController as ApiEventsController } from './events.controller';

describe('Phase 2 events controller contracts', () => {
  it('exposes milestone, institution, and topic overview methods', () => {
    const prototype = ApiEventsController.prototype as Record<string, unknown>;

    expect(typeof prototype.getEventMilestones).toBe('function');
    expect(typeof prototype.getEventInstitutions).toBe('function');
    expect(typeof prototype.getEventTopicOverview).toBe('function');
  });
});
