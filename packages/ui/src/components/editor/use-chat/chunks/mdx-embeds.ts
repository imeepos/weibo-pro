'use client';

import { mdxEmbedsAudioChunks } from './mdx-embeds-audio';
import { mdxEmbedsColumnChunks } from './mdx-embeds-column';
import { mdxEmbedsMathChunks } from './mdx-embeds-math';
import { mdxEmbedsPdfChunks } from './mdx-embeds-pdf';
import { mdxEmbedsVideoChunks } from './mdx-embeds-video';

/**
 * The mock MDX embeds sample is streamed as a single block (the same shape as
 * the original `mdxEmbedsChunks`), so concatenate the split entry arrays back
 * into one.
 */
export const mdxEmbedsChunks = [
  [
    ...mdxEmbedsMathChunks,
    ...mdxEmbedsColumnChunks,
    ...mdxEmbedsPdfChunks,
    ...mdxEmbedsAudioChunks,
    ...mdxEmbedsVideoChunks,
  ],
];
