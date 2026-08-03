'use client';

import { faker } from '@faker-js/faker';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { nanoid, NodeApi } from 'platejs';
import { type PlateEditor } from 'platejs/react';

export const createCommentChunks = (editor: PlateEditor) => {
  const selectedBlocksApi = editor.getApi(BlockSelectionPlugin).blockSelection;

  const selectedBlocks = selectedBlocksApi
    .getNodes({
      selectionFallback: true,
      sort: true,
    })
    .map(([block]) => block);

  const isSelectingSome = editor.getOption(
    BlockSelectionPlugin,
    'isSelectingSome'
  );

  const blocks =
    selectedBlocks.length > 0 && (editor.api.isExpanded() || isSelectingSome)
      ? selectedBlocks
      : editor.children;

  const max = blocks.length;

  const commentCount = Math.ceil(max / 2);

  const result = new Set<number>();

  while (result.size < commentCount) {
    const num = Math.floor(Math.random() * max); // 0 to max-1 (fixed: was 1 to max)
    result.add(num);
  }

  const indexes = Array.from(result).sort((a, b) => a - b);

  const chunks = indexes
    .map((index, i) => {
      const block = blocks[index];
      if (!block) {
        return [];
      }

      const blockString = NodeApi.string(block);
      const endIndex = blockString.indexOf('.');
      const content =
        endIndex === -1 ? blockString : blockString.slice(0, endIndex);

      return [
        {
          delay: faker.number.int({ max: 500, min: 200 }),
          texts: `{"id":"${nanoid()}","data":{"comment":{"blockId":"${block.id}","comment":"${faker.lorem.sentence()}","content":"${content}"},"status":"${i === indexes.length - 1 ? 'finished' : 'streaming'}"},"type":"data-comment"}`,
        },
      ];
    })
    .filter((chunk) => chunk.length > 0);

  const result_chunks = [
    [{ delay: 50, texts: '{"data":"comment","type":"data-toolName"}' }],
    ...chunks,
  ];

  return result_chunks;
};
