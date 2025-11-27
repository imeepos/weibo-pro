import { BaseListPlugin } from '@platejs/list';
import { KEYS } from 'platejs';

import { BaseIndentKit } from '@sker/ui/components/indent-base-kit';
import { BlockListStatic } from '@sker/ui/components/block-list-static';

export const BaseListKit = [
  ...BaseIndentKit,
  BaseListPlugin.configure({
    inject: {
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
      ],
    },
    render: {
      belowNodes: BlockListStatic,
    },
  }),
];
