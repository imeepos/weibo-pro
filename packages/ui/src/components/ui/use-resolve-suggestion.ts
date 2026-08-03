'use client';

import * as React from 'react';

import {
  getSuggestionKey,
  keyId2SuggestionId,
} from '@platejs/suggestion';
import {
  type NodeEntry,
  type Path,
  type TElement,
  type TSuggestionText,
  ElementApi,
  KEYS,
  PathApi,
  TextApi,
} from 'platejs';
import { useEditorPlugin, usePluginOption } from 'platejs/react';

import {
  type TDiscussion,
  discussionPlugin,
} from '@sker/ui/components/editor/plugins/discussion-kit';
import { suggestionPlugin } from '@sker/ui/components/editor/plugins/suggestion-kit';

import {
  BLOCK_SUGGESTION,
  TYPE_TEXT_MAP,
} from './block-suggestion-utils.js';
import type { ResolvedSuggestion } from './block-suggestion-types.js';

export const useResolveSuggestion = (
  suggestionNodes: NodeEntry<TElement | TSuggestionText>[],
  blockPath: Path
) => {
  const discussions = usePluginOption(discussionPlugin, 'discussions');

  const { api, editor, getOption, setOption } =
    useEditorPlugin(suggestionPlugin);

  suggestionNodes.forEach(([node]) => {
    const id = api.suggestion.nodeId(node);
    const map = getOption('uniquePathMap');

    if (!id) return;

    const previousPath = map.get(id);

    // If there are no suggestion nodes in the corresponding path in the map, then update it.
    if (PathApi.isPath(previousPath)) {
      const nodes = api.suggestion.node({ id, at: previousPath, isText: true });
      const parentNode = api.node(previousPath);
      let lineBreakId: string | null = null;

      if (parentNode && ElementApi.isElement(parentNode[0])) {
        lineBreakId = api.suggestion.nodeId(parentNode[0]) ?? null;
      }

      if (!nodes && lineBreakId !== id) {
        setOption('uniquePathMap', new Map(map).set(id, blockPath));
      }
    } else {
      setOption('uniquePathMap', new Map(map).set(id, blockPath));
    }
  });

  const resolvedSuggestion: ResolvedSuggestion[] = React.useMemo(() => {
    const map = getOption('uniquePathMap');

    if (suggestionNodes.length === 0) return [];

    const suggestionIds = new Set(
      suggestionNodes
        .flatMap(([node]) => {
          if (TextApi.isText(node)) {
            const dataList = api.suggestion.dataList(node);
            const includeUpdate = dataList.some(
              (data) => data.type === 'update'
            );

            if (!includeUpdate) {
              return api.suggestion.nodeId(node) ?? [];
            }

            return dataList
              .filter((data) => data.type === 'update')
              .map((d) => d.id);
          }
          if (ElementApi.isElement(node)) {
            return api.suggestion.nodeId(node) ?? [];
          }

          return [];
        })
        .filter(Boolean)
    );

    const res: ResolvedSuggestion[] = [];

    suggestionIds.forEach((id) => {
      if (!id) return;

      const path = map.get(id);

      if (!path || !PathApi.isPath(path)) return;
      if (!PathApi.equals(path, blockPath)) return;

      const entries = [
        ...editor.api.nodes<TElement | TSuggestionText>({
          at: [],
          mode: 'all',
          match: (n) =>
            (n[KEYS.suggestion] && n[getSuggestionKey(id)]) ||
            api.suggestion.nodeId(n as TElement) === id,
        }),
      ];

      // move line break to the end
      entries.sort(([, path1], [, path2]) =>
        PathApi.isChild(path1, path2) ? -1 : 1
      );

      let newText = '';
      let text = '';
      let properties: any = {};
      let newProperties: any = {};

      // overlapping suggestion
      entries.forEach(([node]) => {
        if (TextApi.isText(node)) {
          const dataList = api.suggestion.dataList(node);

          dataList.forEach((data) => {
            if (data.id === id) {
              switch (data.type) {
                case 'insert': {
                  newText += node.text;

                  break;
                }
                case 'remove': {
                  text += node.text;

                  break;
                }
                case 'update': {
                  properties = {
                    ...properties,
                    ...data.properties,
                  };

                  newProperties = {
                    ...newProperties,
                    ...data.newProperties,
                  };

                  newText += node.text;

                  break;
                }
                // No default
              }
            }
          });
        } else {
          const lineBreakData = api.suggestion.isBlockSuggestion(node)
            ? node.suggestion
            : undefined;

          if (lineBreakData?.id === keyId2SuggestionId(id)) {
            if (lineBreakData.type === 'insert') {
              newText += lineBreakData.isLineBreak
                ? BLOCK_SUGGESTION
                : BLOCK_SUGGESTION + (TYPE_TEXT_MAP[node.type]?.(node) || 'Unknown');
            } else if (lineBreakData.type === 'remove') {
              text += lineBreakData.isLineBreak
                ? BLOCK_SUGGESTION
                : BLOCK_SUGGESTION + (TYPE_TEXT_MAP[node.type]?.(node) || 'Unknown');
            }
          }
        }
      });

      if (entries.length === 0) return;

      const nodeData = entries[0] ? api.suggestion.suggestionData(entries[0][0]) : undefined;

      if (!nodeData) return;

      // const comments = data?.discussions.find((d) => d.id === id)?.comments;
      const comments =
        discussions.find((s: TDiscussion) => s.id === id)?.comments || [];
      const createdAt = new Date(nodeData.createdAt);

      const keyId = getSuggestionKey(id);

      if (nodeData.type === 'update') {
        res.push({
          comments,
          createdAt,
          keyId,
          newProperties,
          newText,
          properties,
          suggestionId: keyId2SuggestionId(id),
          type: 'update',
          userId: nodeData.userId,
        });
      } else if (newText.length > 0 && text.length > 0) {
        res.push({
          comments,
          createdAt,
          keyId,
          newText,
          suggestionId: keyId2SuggestionId(id),
          text,
          type: 'replace',
          userId: nodeData.userId,
        });
      } else if (newText.length > 0) {
        res.push({
          comments,
          createdAt,
          keyId,
          newText,
          suggestionId: keyId2SuggestionId(id),
          type: 'insert',
          userId: nodeData.userId,
        });
      } else if (text.length > 0) {
        res.push({
          comments,
          createdAt,
          keyId,
          suggestionId: keyId2SuggestionId(id),
          text,
          type: 'remove',
          userId: nodeData.userId,
        });
      }
    });

    return res;
  }, [
    api.suggestion,
    blockPath,
    discussions,
    editor.api,
    getOption,
    suggestionNodes,
  ]);

  return resolvedSuggestion;
};
