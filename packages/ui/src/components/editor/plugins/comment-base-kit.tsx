import { BaseCommentPlugin } from '@platejs/comment';

import { CommentLeafStatic } from '@sker/ui/components/ui/comment-node-static';

export const BaseCommentKit = [
  BaseCommentPlugin.withComponent(CommentLeafStatic),
];
