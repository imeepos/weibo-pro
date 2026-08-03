import type { CreatePlateEditorOptions } from 'platejs/react';
import { usePlateEditor } from 'platejs/react';

import { BasicMarksKit } from '@sker/ui/components/editor/plugins/basic-marks-kit';

export const useCommentEditor = (
  options: Omit<CreatePlateEditorOptions, 'plugins'> = {},
  deps: any[] = []
): any => {
  const commentEditor = usePlateEditor(
    {
      id: 'comment',
      plugins: BasicMarksKit,
      value: [],
      ...options,
    },
    deps
  );

  return commentEditor;
};
