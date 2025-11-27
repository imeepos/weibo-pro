'use client';

import { TogglePlugin } from '@platejs/toggle/react';

import { IndentKit } from '@sker/ui/components/editor/plugins/indent-kit';
import { ToggleElement } from '@sker/ui/components/ui/toggle-node';

export const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
];
