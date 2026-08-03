'use client';

import type { RenderNodeWrapper } from 'platejs/react';

import { getTransientSuggestionKey } from '@platejs/suggestion';
import { CommentPlugin } from '@platejs/comment/react';
import { SuggestionPlugin } from '@platejs/suggestion/react';
import type { AnyPluginConfig } from 'platejs';

import { BlockCommentContent } from './block-discussion-content.js';

export const BlockDiscussion: RenderNodeWrapper<AnyPluginConfig> = (props) => {
    const { editor, element } = props;

    const commentsApi = editor.getApi(CommentPlugin).comment;
    const blockPath = editor.api.findPath(element);

    // avoid duplicate in table or column
    if (!blockPath || blockPath.length > 1) return;

    const draftCommentNode = commentsApi.node({ at: blockPath, isDraft: true });

    const commentNodes = [...commentsApi.nodes({ at: blockPath })];

    const suggestionNodes = [
        ...editor.getApi(SuggestionPlugin).suggestion.nodes({ at: blockPath }),
    ].filter(([node]) => !node[getTransientSuggestionKey()]);

    if (
        commentNodes.length === 0 &&
        suggestionNodes.length === 0 &&
        !draftCommentNode
    ) {
        return;
    }

    return (props) => (
        <BlockCommentContent
            blockPath={blockPath}
            commentNodes={commentNodes}
            draftCommentNode={draftCommentNode}
            suggestionNodes={suggestionNodes}
            {...props}
        />
    );
};
