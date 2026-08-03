'use client';

import { type PlateEditor } from 'platejs/react';

import { fakeStreamText } from './fake-stream';

type AbortControllerRef = { current: AbortController | null };

export type FakeStreamSample = 'comment' | 'markdown' | 'mdx' | null;

/**
 * Detect which mock sample should be streamed based on the request body.
 * Matches the prompts the editor sends for markdown / mdx / comment samples.
 */
export const detectSample = (body: string): FakeStreamSample => {
  try {
    const content = JSON.parse(body)
      .messages.at(-1)
      .parts.find((p: any) => p.type === 'text')?.text;

    if (content.includes('Generate a markdown sample')) {
      return 'markdown';
    }

    if (content.includes('Generate a mdx sample')) {
      return 'mdx';
    }

    if (content.includes('comment')) {
      return 'comment';
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Mock fetch middleware for the chat transport.
 * Removes it when you implement the route /api/ai/command.
 */
export const createMockFetch = ({
  editor,
  abortControllerRef,
  getBodyOptions,
}: {
  editor: PlateEditor;
  abortControllerRef: AbortControllerRef;
  getBodyOptions: () => object | undefined;
}): typeof fetch => {
  return (async (input, init) => {
    const initBody = JSON.parse(init?.body as string);

    const body = {
      ...initBody,
      ...getBodyOptions(),
    };

    const res = await fetch(input, {
      ...init,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const sample = detectSample(init?.body as string);

      abortControllerRef.current = new AbortController();

      await new Promise((resolve) => setTimeout(resolve, 400));

      const stream = fakeStreamText({
        editor,
        sample,
        signal: abortControllerRef.current.signal,
      });

      const response = new Response(stream, {
        headers: {
          Connection: 'keep-alive',
          'Content-Type': 'text/plain',
        },
      });

      return response;
    }

    return res;
  }) as typeof fetch;
};
