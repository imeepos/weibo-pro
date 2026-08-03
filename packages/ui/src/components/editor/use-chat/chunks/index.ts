'use client';

import { createCommentChunks } from './comment';
import { markdownChunks } from './markdown';
import { mdxBasicChunks } from './mdx-basic';
import { mdxEmbedsChunks } from './mdx-embeds';
import { mdxFeaturesChunks } from './mdx-features';

export { createCommentChunks, markdownChunks };

/**
 * The mock MDX sample is streamed as a single block (the same shape as the
 * original `mdxChunks`), so concatenate the split entry arrays back into one.
 */
export const mdxChunks = [
  [
    ...mdxBasicChunks.flat(),
    ...mdxFeaturesChunks.flat(),
    ...mdxEmbedsChunks.flat(),
  ],
];
