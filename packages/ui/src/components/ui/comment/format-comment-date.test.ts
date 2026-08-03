import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatCommentDate } from './format-comment-date';

const NOW = new Date('2026-08-03T12:00:00Z');

describe('formatCommentDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats minutes when diff is less than 1 hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatCommentDate(new Date('2026-08-03T11:55:00Z'))).toBe('5m');
    expect(formatCommentDate(new Date('2026-08-03T11:30:00Z'))).toBe('30m');
  });

  it('formats hours when diff is between 1 and 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatCommentDate(new Date('2026-08-03T10:30:00Z'))).toBe('1h');
    expect(formatCommentDate(new Date('2026-08-03T00:00:00Z'))).toBe('12h');
    expect(formatCommentDate(new Date('2026-08-02T13:00:00Z'))).toBe('23h');
  });

  it('formats days when diff is 1 day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatCommentDate(new Date('2026-08-02T12:00:00Z'))).toBe('1d');
  });

  it('falls back to a full date when diff is 2 days or more', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatCommentDate(new Date('2026-08-01T12:00:00Z'))).toBe('08/01/2026');
    expect(formatCommentDate(new Date('2026-07-15T12:00:00Z'))).toBe('07/15/2026');
  });
});
