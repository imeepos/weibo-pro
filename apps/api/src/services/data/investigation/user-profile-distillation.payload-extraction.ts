export function collectProfileCandidates(response: unknown): unknown[] {
  const candidates: unknown[] = [];
  appendProfileCandidates(response, candidates, new WeakSet<object>(), 0);
  return candidates;
}

function appendProfileCandidates(
  value: unknown,
  candidates: unknown[],
  seen: WeakSet<object>,
  depth: number,
): void {
  if (value == null || depth > 4 || candidates.length >= 24) {
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      candidates.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    const joinedText = extractTextFragments(value).join('\n').trim();
    if (joinedText) {
      candidates.push(joinedText);
    }

    for (const item of value) {
      appendProfileCandidates(item, candidates, seen, depth + 1);
      if (candidates.length >= 24) {
        return;
      }
    }

    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  const record = value as Record<string, unknown>;
  const prioritizedKeys = [
    'parsed',
    'raw',
    'content',
    'text',
    'message',
    'output',
    'response',
    'completion',
    'data',
    'value',
  ];
  const visitedKeys = new Set<string>();

  for (const key of prioritizedKeys) {
    if (!(key in record)) {
      continue;
    }

    visitedKeys.add(key);
    appendProfileCandidates(record[key], candidates, seen, depth + 1);
    if (candidates.length >= 24) {
      return;
    }
  }

  const joinedText = extractTextFragments(record).join('\n').trim();
  if (joinedText) {
    candidates.push(joinedText);
  }

  for (const [key, nestedValue] of Object.entries(record)) {
    if (visitedKeys.has(key)) {
      continue;
    }

    appendProfileCandidates(nestedValue, candidates, seen, depth + 1);
    if (candidates.length >= 24) {
      return;
    }
  }
}

function extractTextFragments(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTextFragments(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const fragments: string[] = [];

  if (typeof record.text === 'string' && record.text.trim()) {
    fragments.push(record.text);
  }
  if (typeof record.value === 'string' && record.value.trim()) {
    fragments.push(record.value);
  }
  if (typeof record.content === 'string' && record.content.trim()) {
    fragments.push(record.content);
  }

  return fragments;
}

export function extractJsonPayloads(response: string): string[] {
  const normalized = response.replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    return [];
  }

  const candidates: string[] = [normalized];
  const fenceRegex = /`{3,}\s*(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*`{3,}/gi;

  for (const match of normalized.matchAll(fenceRegex)) {
    const content = match[1]?.trim();
    if (content) {
      candidates.push(content);
    }
  }

  const withoutFence = normalized
    .replace(/^`{3,}\s*(?:[a-zA-Z0-9_-]+)?\s*/i, '')
    .replace(/\s*`{3,}$/i, '')
    .trim();
  if (withoutFence) {
    candidates.push(withoutFence);
  }

  const balancedFromOriginal = extractBalancedJsonCandidate(normalized);
  if (balancedFromOriginal) {
    candidates.push(balancedFromOriginal);
  }

  if (withoutFence !== normalized) {
    const balancedWithoutFence = extractBalancedJsonCandidate(withoutFence);
    if (balancedWithoutFence) {
      candidates.push(balancedWithoutFence);
    }
  }

  return Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.trim())
        .filter(Boolean),
    ),
  );
}

export function extractBalancedJsonCandidate(text: string): string | null {
  const braceIndex = text.indexOf('{');
  const bracketIndex = text.indexOf('[');

  if (braceIndex === -1 && bracketIndex === -1) {
    return null;
  }

  const startsWithArray =
    bracketIndex !== -1 && (braceIndex === -1 || bracketIndex < braceIndex);
  const startIndex = startsWithArray ? bracketIndex : braceIndex;
  const openChar = startsWithArray ? '[' : '{';
  const closeChar = startsWithArray ? ']' : '}';

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1).trim();
      }
    }
  }

  return null;
}
