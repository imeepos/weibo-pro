import { describe, expect, it } from 'vitest';
import { buildUserDataQuality } from './user-data-quality';

describe('buildUserDataQuality', () => {
  it('returns filtered count and coverage from candidate and eligible users', () => {
    expect(buildUserDataQuality(80, 50)).toEqual({
      eligibleCount: 50,
      filteredCount: 30,
      coverageRate: 62.5,
    });
  });

  it('returns zero coverage when there are no candidates', () => {
    expect(buildUserDataQuality(0, 0)).toEqual({
      eligibleCount: 0,
      filteredCount: 0,
      coverageRate: 0,
    });
  });
});
