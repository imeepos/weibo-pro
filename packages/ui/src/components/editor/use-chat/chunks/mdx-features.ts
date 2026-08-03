'use client';

import { mdxFeaturesCalloutChunks } from './mdx-features-callout';
import { mdxFeaturesMarksChunks } from './mdx-features-marks';
import { mdxFeaturesNotationChunks } from './mdx-features-notation';
import { mdxFeaturesInlineChunks } from './mdx-features-inline';
import { mdxFeaturesTocChunks } from './mdx-features-toc';

export const mdxFeaturesChunks = [
  [
    ...mdxFeaturesCalloutChunks,
    ...mdxFeaturesMarksChunks,
    ...mdxFeaturesNotationChunks,
    ...mdxFeaturesInlineChunks,
    ...mdxFeaturesTocChunks,
  ],
];
