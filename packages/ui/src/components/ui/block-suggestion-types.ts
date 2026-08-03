import type { TResolvedSuggestion } from '@platejs/suggestion';

import type { TDiscussion } from '@sker/ui/components/editor/plugins/discussion-kit';

import type { TComment } from './comment.js';

export interface ResolvedSuggestion extends TResolvedSuggestion {
  comments: TComment[];
}

export const isResolvedSuggestion = (
  suggestion: ResolvedSuggestion | TDiscussion
): suggestion is ResolvedSuggestion => 'suggestionId' in suggestion;
