import { type TElement, KEYS } from 'platejs';

export const BLOCK_SUGGESTION = '__block__';

export const TYPE_TEXT_MAP: Record<string, (node?: TElement) => string> = {
  [KEYS.audio]: () => 'Audio',
  [KEYS.blockquote]: () => 'Blockquote',
  [KEYS.callout]: () => 'Callout',
  [KEYS.codeBlock]: () => 'Code Block',
  [KEYS.column]: () => 'Column',
  [KEYS.equation]: () => 'Equation',
  [KEYS.file]: () => 'File',
  [KEYS.h1]: () => 'Heading 1',
  [KEYS.h2]: () => 'Heading 2',
  [KEYS.h3]: () => 'Heading 3',
  [KEYS.h4]: () => 'Heading 4',
  [KEYS.h5]: () => 'Heading 5',
  [KEYS.h6]: () => 'Heading 6',
  [KEYS.hr]: () => 'Horizontal Rule',
  [KEYS.img]: () => 'Image',
  [KEYS.mediaEmbed]: () => 'Media',
  [KEYS.p]: (node) => {
    if (node?.[KEYS.listType] === KEYS.listTodo) return 'Todo List';
    if (node?.[KEYS.listType] === KEYS.ol) return 'Ordered List';
    if (node?.[KEYS.listType] === KEYS.ul) return 'List';

    return 'Paragraph';
  },
  [KEYS.table]: () => 'Table',
  [KEYS.toc]: () => 'Table of Contents',
  [KEYS.toggle]: () => 'Toggle',
  [KEYS.video]: () => 'Video',
};

export const suggestionText2Array = (text: string) => {
  if (text === BLOCK_SUGGESTION) return ['line breaks'];

  return text.split(BLOCK_SUGGESTION).filter(Boolean);
};
