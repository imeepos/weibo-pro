import { describe, expect, it } from 'vitest';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import { validProfile } from './__fixtures__/user-profile-distillation.fixtures';

describe('distilled user profile schema', () => {
  it('validates required summary, risk, and memory drafts', () => {
    const parsed = distilledUserProfileSchema.parse(validProfile);

    expect(parsed.risk.overallLevel).toBe('high');
    expect(parsed.memoryDrafts).toHaveLength(1);
  });
});
