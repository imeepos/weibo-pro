export function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return compactStrings(
      value.map((item) => (typeof item === 'string' ? item : firstNonEmptyString(item))),
    );
  }

  const singleValue = firstNonEmptyString(value);
  return singleValue ? [singleValue] : [];
}

export function compactStrings(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function shorten(value: string, maxLength: number = 120): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
