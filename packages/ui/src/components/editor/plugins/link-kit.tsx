'use client';
import React from 'react'
import { LinkPlugin } from '@platejs/link/react';

import { LinkElement } from '@sker/ui/components/ui/link-node';
import { LinkFloatingToolbar } from '@sker/ui/components/ui/link-toolbar';

export const LinkKit = [
  LinkPlugin.configure({
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];
