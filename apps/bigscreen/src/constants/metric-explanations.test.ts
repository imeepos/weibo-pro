import { describe, expect, it } from 'vitest';
import {
  getMetricExplanation,
  metricExplanationRegistry,
} from './metric-explanations';

describe('metric explanation registry', () => {
  it('contains all Phase 1 explanation groups', () => {
    expect(metricExplanationRegistry['spread-breadth'].definitions[0]?.key).toBe(
      'uniqueReposters',
    );
    expect(
      getMetricExplanation('sentiment-transition').definitions.some(
        (item) => item.key === 'stabilityIndex',
      ),
    ).toBe(true);
    expect(
      getMetricExplanation('anomaly-timeline').definitions.some(
        (item) => item.key === 'confidence',
      ),
    ).toBe(true);
  });
});
