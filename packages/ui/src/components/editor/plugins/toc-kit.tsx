'use client';

import { TocPlugin } from '@platejs/toc/react';

import { TocElement } from '@sker/ui/components/ui/toc-node';

export const TocKit = [
  TocPlugin.configure({
    options: {
      // isScroll: true,
      topOffset: 80,
    },
  }).withComponent(TocElement),
];
