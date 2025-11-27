import { BaseMentionPlugin } from '@platejs/mention';

import { MentionElementStatic } from '@sker/ui/components/ui/mention-node-static';

export const BaseMentionKit = [
  BaseMentionPlugin.withComponent(MentionElementStatic),
];
