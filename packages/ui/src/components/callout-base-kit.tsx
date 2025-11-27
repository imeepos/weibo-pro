import { BaseCalloutPlugin } from '@platejs/callout';

import { CalloutElementStatic } from '@sker/ui/components/callout-node-static';

export const BaseCalloutKit = [
  BaseCalloutPlugin.withComponent(CalloutElementStatic),
];
