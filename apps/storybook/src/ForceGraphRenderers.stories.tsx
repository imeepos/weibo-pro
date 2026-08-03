import type { Meta, StoryObj } from '@storybook/react';
import {
  NodeShapeVariationsRender,
  NodeOpacityByActivityRender,
  PulseAnimationConfigRender,
} from './ForceGraphRenderers.stories/node-shape-components';
import {
  WireframeAndGlowEffectsRender,
  HighlightEffectRender,
  CombinedEffectsRender,
} from './ForceGraphRenderers.stories/node-effect-components';
import {
  LinkColorByTypeRender,
  LinkParticleAnimationRender,
} from './ForceGraphRenderers.stories/link-components';

const meta = {
  title: 'Charts/ForceGraph Renderers',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const NodeShapeVariations: Story = {
  render: () => <NodeShapeVariationsRender />,
};

export const NodeOpacityByActivity: Story = {
  render: () => <NodeOpacityByActivityRender />,
};

export const PulseAnimationConfig: Story = {
  render: () => <PulseAnimationConfigRender />,
};

export const LinkColorByType: Story = {
  render: () => <LinkColorByTypeRender />,
};

export const LinkParticleAnimation: Story = {
  render: () => <LinkParticleAnimationRender />,
};

export const WireframeAndGlowEffects: Story = {
  render: () => <WireframeAndGlowEffectsRender />,
};

export const HighlightEffect: Story = {
  render: () => <HighlightEffectRender />,
};

export const CombinedEffects: Story = {
  render: () => <CombinedEffectsRender />,
};
