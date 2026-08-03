import { describe, expect, it } from 'vitest';

import {
  Comment,
  CommentCreateForm,
  formatCommentDate,
} from '../comment.js';

import type { TComment } from './types.js';
import { formatCommentDate as utilFormatCommentDate } from './format-comment-date.js';

describe('comment public API', () => {
  it('keeps the TComment type shape required by consumers', () => {
    const comment: TComment = {
      id: 'c1',
      contentRich: [{ children: [{ text: 'hello' }], type: 'p' }],
      createdAt: new Date('2026-08-03T12:00:00Z'),
      discussionId: 'd1',
      isEdited: false,
      userId: 'alice',
    };

    expect(comment.id).toBe('c1');
    expect(comment.discussionId).toBe('d1');
    expect(comment.userId).toBe('alice');
  });

  it('re-exports Comment, CommentCreateForm and formatCommentDate from comment.js', () => {
    expect(typeof Comment).toBe('function');
    expect(typeof CommentCreateForm).toBe('function');
    expect(typeof formatCommentDate).toBe('function');
  });

  it('re-exports the same formatCommentDate implementation', () => {
    expect(formatCommentDate).toBe(utilFormatCommentDate);
  });
});
