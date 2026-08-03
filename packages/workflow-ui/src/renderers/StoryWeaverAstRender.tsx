import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { StoryWeaverAst } from '@sker/workflow-ast';
import React from 'react';
import { StoryWeaverContent } from './StoryWeaverContent';

@Injectable()
export class StoryWeaverAstRender {
  @Render(StoryWeaverAst)
  render(ast: StoryWeaverAst) {
    return <StoryWeaverContent ast={ast} />;
  }
}
