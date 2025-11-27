import { BaseTogglePlugin } from '@platejs/toggle';

import { ToggleElementStatic } from '@sker/ui/components/toggle-node-static';

export const BaseToggleKit = [
  BaseTogglePlugin.withComponent(ToggleElementStatic),
];
