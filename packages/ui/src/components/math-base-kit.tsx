import { BaseEquationPlugin, BaseInlineEquationPlugin } from '@platejs/math';

import {
  EquationElementStatic,
  InlineEquationElementStatic,
} from '@sker/ui/components/equation-node-static';

export const BaseMathKit = [
  BaseInlineEquationPlugin.withComponent(InlineEquationElementStatic),
  BaseEquationPlugin.withComponent(EquationElementStatic),
];
