import { describe, expect, it } from 'vitest';
import {
  createAnalysisWidgetState,
  resolveAnalysisWidgetState,
} from './analysis-widget';

describe('analysis-widget helpers', () => {
  it('maps settled promises to success, empty, and error states', () => {
    const success = resolveAnalysisWidgetState(
      { status: 'fulfilled', value: [1, 2, 3] },
      (value) => value.length === 0,
    );
    expect(success).toEqual({
      status: 'success',
      data: [1, 2, 3],
      error: null,
    });

    const empty = resolveAnalysisWidgetState(
      { status: 'fulfilled', value: [] as number[] },
      (value) => value.length === 0,
    );
    expect(empty).toEqual({
      status: 'empty',
      data: [],
      error: null,
    });

    const failure = resolveAnalysisWidgetState<number[]>(
      { status: 'rejected', reason: new Error('media failed') },
      (value) => value.length === 0,
    );
    expect(failure).toEqual({
      status: 'error',
      data: null,
      error: 'media failed',
    });

    expect(createAnalysisWidgetState<number[]>()).toEqual({
      status: 'idle',
      data: null,
      error: null,
    });
  });
});
