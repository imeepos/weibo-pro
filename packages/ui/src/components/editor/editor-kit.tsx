'use client';

import { type Value, TrailingBlockPlugin } from 'platejs';
import { type TPlateEditor, useEditorRef } from 'platejs/react';

import { AIKit } from './plugins/ai-kit.js';
import { AlignKit } from './plugins/align-kit.js';
import { AutoformatKit } from './plugins/autoformat-kit.js';
import { BasicBlocksKit } from './plugins/basic-blocks-kit.js';
import { BasicMarksKit } from './plugins/basic-marks-kit.js';
import { BlockMenuKit } from './plugins/block-menu-kit.js';
import { BlockPlaceholderKit } from './plugins/block-placeholder-kit.js';
import { CalloutKit } from './plugins/callout-kit.js';
import { CodeBlockKit } from './plugins/code-block-kit.js';
import { ColumnKit } from './plugins/column-kit.js';
import { CommentKit } from './plugins/comment-kit.js';
import { CursorOverlayKit } from './plugins/cursor-overlay-kit.js';
import { DateKit } from './plugins/date-kit.js';
import { DiscussionKit } from './plugins/discussion-kit.js';
import { DndKit } from './plugins/dnd-kit.js';
import { DocxKit } from './plugins/docx-kit.js';
import { EmojiKit } from './plugins/emoji-kit.js';
import { ExitBreakKit } from './plugins/exit-break-kit.js';
import { FixedToolbarKit } from './plugins/fixed-toolbar-kit.js';
import { FloatingToolbarKit } from './plugins/floating-toolbar-kit.js';
import { FontKit } from './plugins/font-kit.js';
import { LineHeightKit } from './plugins/line-height-kit.js';
import { LinkKit } from './plugins/link-kit.js';
import { ListKit } from './plugins/list-kit.js';
import { MarkdownKit } from './plugins/markdown-kit.js';
import { MathKit } from './plugins/math-kit.js';
import { MediaKit } from './plugins/media-kit.js';
import { MentionKit } from './plugins/mention-kit.js';
import { SlashKit } from './plugins/slash-kit.js';
import { SuggestionKit } from './plugins/suggestion-kit.js';
import { TableKit } from './plugins/table-kit.js';
import { TocKit } from './plugins/toc-kit.js';
import { ToggleKit } from './plugins/toggle-kit.js';

export const EditorKit = [
  ...AIKit,
  ...BlockMenuKit,

  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
