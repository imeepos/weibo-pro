export type AnalysisWidgetStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error';

export interface AnalysisWidgetState<T> {
  status: AnalysisWidgetStatus;
  data: T | null;
  error: string | null;
}

export const createAnalysisWidgetState = <T,>(
  overrides: Partial<AnalysisWidgetState<T>> = {},
): AnalysisWidgetState<T> => ({
  status: 'idle',
  data: null,
  error: null,
  ...overrides,
});

export function resolveAnalysisWidgetState<T>(
  result: PromiseSettledResult<T>,
  isEmpty: (value: T) => boolean,
): AnalysisWidgetState<T> {
  if (result.status === 'rejected') {
    return createAnalysisWidgetState({
      status: 'error',
      error: result.reason instanceof Error ? result.reason.message : '加载失败',
    });
  }

  if (isEmpty(result.value)) {
    return createAnalysisWidgetState({
      status: 'empty',
      data: result.value,
    });
  }

  return createAnalysisWidgetState({
    status: 'success',
    data: result.value,
  });
}
