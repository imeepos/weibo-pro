import {
    type NodeEntry,
    type Path,
    type TCommentText,
    PathApi,
} from 'platejs';
import { useEditorPlugin, usePluginOption } from 'platejs/react';

import {
    type TDiscussion,
    discussionPlugin,
} from '@sker/ui/components/editor/plugins/discussion-kit';
import { commentPlugin } from '@sker/ui/components/editor/plugins/comment-kit';

export const useResolvedDiscussion = (
    commentNodes: NodeEntry<TCommentText>[],
    blockPath: Path
) => {
    const { api, getOption, setOption } = useEditorPlugin(commentPlugin);

    const discussions = usePluginOption(discussionPlugin, 'discussions');

    commentNodes.forEach(([node]) => {
        const id = api.comment.nodeId(node);
        const map = getOption('uniquePathMap');

        if (!id) return;

        const previousPath = map.get(id);

        // If there are no comment nodes in the corresponding path in the map, then update it.
        if (PathApi.isPath(previousPath)) {
            const nodes = api.comment.node({ id, at: previousPath });

            if (!nodes) {
                setOption('uniquePathMap', new Map(map).set(id, blockPath));
                return;
            }

            return;
        }
        // TODO: fix throw error
        setOption('uniquePathMap', new Map(map).set(id, blockPath));
    });

    const commentsIds = new Set(
        commentNodes.map(([node]) => api.comment.nodeId(node)).filter(Boolean)
    );

    const resolvedDiscussions = discussions
        .map((d: TDiscussion) => ({
            ...d,
            createdAt: new Date(d.createdAt),
        }))
        .filter((item: TDiscussion) => {
            /** If comment cross blocks just show it in the first block */
            const commentsPathMap = getOption('uniquePathMap');
            const firstBlockPath = commentsPathMap.get(item.id);

            if (!firstBlockPath) return false;
            if (!PathApi.equals(firstBlockPath, blockPath)) return false;

            return (
                api.comment.has({ id: item.id }) &&
                commentsIds.has(item.id) &&
                !item.isResolved
            );
        });

    return resolvedDiscussions;
};
