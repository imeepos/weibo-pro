import { BaseAlignKit } from './plugins/align-base-kit.js';
import { BaseBasicBlocksKit } from './plugins/basic-blocks-base-kit.js';
import { BaseBasicMarksKit } from './plugins/basic-marks-base-kit.js';
import { BaseCalloutKit } from './plugins/callout-base-kit.js';
import { BaseCodeBlockKit } from './plugins/code-block-base-kit.js';
import { BaseColumnKit } from './plugins/column-base-kit.js';
import { BaseCommentKit } from './plugins/comment-base-kit.js';
import { BaseDateKit } from './plugins/date-base-kit.js';
import { BaseFontKit } from './plugins/font-base-kit.js';
import { BaseLineHeightKit } from './plugins/line-height-base-kit.js';
import { BaseLinkKit } from './plugins/link-base-kit.js';
import { BaseListKit } from './plugins/list-base-kit.js';
import { MarkdownKit } from './plugins/markdown-kit.js';
import { BaseMathKit } from './plugins/math-base-kit.js';
import { BaseMediaKit } from './plugins/media-base-kit.js';
import { BaseMentionKit } from './plugins/mention-base-kit.js';
import { BaseSuggestionKit } from './plugins/suggestion-base-kit.js';
import { BaseTableKit } from './plugins/table-base-kit.js';
import { BaseTocKit } from './plugins/toc-base-kit.js';
import { BaseToggleKit } from './plugins/toggle-base-kit.js';

export const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseCodeBlockKit,
  ...BaseTableKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...BaseMediaKit,
  ...BaseCalloutKit,
  ...BaseColumnKit,
  ...BaseMathKit,
  ...BaseDateKit,
  ...BaseLinkKit,
  ...BaseMentionKit,
  ...BaseBasicMarksKit,
  ...BaseFontKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...BaseLineHeightKit,
  ...BaseCommentKit,
  ...BaseSuggestionKit,
  ...MarkdownKit,
];
