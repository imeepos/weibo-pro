import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { PostNLPLooperAst } from '@sker/workflow-ast';
import React from 'react';

const PostNLPLooperComponent: React.FC<{ ast: PostNLPLooperAst }> = () => {
  return null; // 空渲染，使用默认 UI
};

@Injectable()
export class PostNLPLooperAstRender {
  @Render(PostNLPLooperAst)
  render(ast: PostNLPLooperAst) {
    return <PostNLPLooperComponent ast={ast} />;
  }
}
