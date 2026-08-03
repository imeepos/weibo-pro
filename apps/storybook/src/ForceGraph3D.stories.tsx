import type { Meta } from '@storybook/react';
import { ForceGraph3D } from '@sker/ui/components/ui/force-graph-3d';
import {
  BasicRender,
  WithCustomRenderersRender,
  WithPulseAnimationRender,
  WithCameraControlRender,
} from './ForceGraph3D.stories/components';
import {
  InteractiveHighlightRender,
  DifferentShapesRender,
  ColorfulLinksRender,
  LargeGraphRender,
  OpacityVariationRender,
} from './ForceGraph3D.stories/components-advanced';

const meta = {
  title: 'Charts/ForceGraph3D',
  component: ForceGraph3D,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    backgroundColor: {
      control: 'color',
      description: '背景颜色',
    },
    controlType: {
      control: 'select',
      options: ['trackball', 'orbit', 'fly'],
      description: '控制类型',
    },
    enableNodeDrag: {
      control: 'boolean',
      description: '是否允许拖拽节点',
    },
    enableNavigationControls: {
      control: 'boolean',
      description: '是否显示导航控制',
    },
    linkCurvature: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '连线曲率',
    },
  },
} satisfies Meta<typeof ForceGraph3D>;

export default meta;

export const Basic = {
  render: () => <BasicRender />,
};

export const WithCustomRenderers = {
  render: () => <WithCustomRenderersRender />,
};

export const WithPulseAnimation = {
  render: () => <WithPulseAnimationRender />,
};

export const InteractiveHighlight = {
  render: () => <InteractiveHighlightRender />,
};

export const DifferentShapes = {
  render: () => <DifferentShapesRender />,
};

export const ColorfulLinks = {
  render: () => <ColorfulLinksRender />,
};

export const LargeGraph = {
  render: () => <LargeGraphRender />,
};

export const WithCameraControl = {
  render: () => <WithCameraControlRender />,
};

export const OpacityVariation = {
  render: () => <OpacityVariationRender />,
};
